import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Coins, History, Zap, Trophy, TrendingUp, 
  ArrowUpCircle, ArrowDownCircle, Info, Sparkles, AlertCircle, ShoppingBag, ArrowUpRight
} from 'lucide-react';
import { XPWalletCard } from '../../components/xp/XPWalletCard.tsx';
import { ReferralSection } from '../../components/xp/ReferralSection.tsx';
import { xpService } from '../../services/xpService.ts';

const parseLocalDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const cleanStr = typeof dateStr === 'string' && dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
  return new Date(cleanStr);
};

export function XPWallet() {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [balanceRes, transRes] = await Promise.all([
        xpService.getBalance(),
        xpService.getTransactions()
      ]);
      setBalanceData(balanceRes.balance);
      setTransactions(transRes.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Re-fetch when XP update dispatch is captured (e.g. on reward claim)
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('xp_updated', handleUpdate);
    return () => window.removeEventListener('xp_updated', handleUpdate);
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 font-sans text-slate-850">
      <div className="w-full space-y-8">
        
        {/* Dynamic Header Block with Glowing Elements */}
        <div className="relative overflow-hidden bg-slate-900 text-white rounded-[2rem] p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -ml-24 -mb-24 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
                <Coins size={24} className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] uppercase font-bold tracking-wider border border-indigo-500/30">
                    Student Economy
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[9px] uppercase font-bold tracking-wider border border-amber-500/30">
                    Level Up Benefits
                  </span>
                </div>
                <h1 className="text-2.5xl sm:text-4xl font-extrabold text-white uppercase tracking-tight leading-none">
                  XP Economy & Rewards
                </h1>
                <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">
                  Manage virtual earnings, utilities, and exclusive career benefits
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/xp-store'}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-950/40 border border-indigo-400/20 cursor-pointer text-center"
            >
              <ShoppingBag size={14} />
              <span>Visit VEGA Rewards Center</span>
            </button>
          </div>
        </div>

        {/* Dashboard Grid split into Cards & Lists vs. Sidebar rules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area (Column Span 8) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Wallet Core & Referral Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <XPWalletCard />
              <ReferralSection referralCode={balanceData?.referral_code} />
            </div>

            {/* Performance Stats Bento Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatsBox 
                label="Total Earned" 
                value={balanceData?.total_earned_xp || 0} 
                icon={<TrendingUp className="text-emerald-500" />} 
                suffix="XP"
                sub="Cumulative income"
                colorTheme="emerald"
              />
              <StatsBox 
                label="Total Spent" 
                value={balanceData?.total_spent_xp || 0} 
                icon={<ArrowDownCircle className="text-rose-500" />} 
                suffix="XP"
                sub="Utilities consumed"
                colorTheme="rose"
              />
              <StatsBox 
                label="Wallet Efficiency" 
                value="94%" 
                icon={<Zap className="text-blue-500 animate-pulse" />} 
                sub="Optimal XP usage"
                colorTheme="blue"
              />
            </div>

            {/* Pristine Styled Activity Log */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <History className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Financial Timeline</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Recent XP logs & loyalty rewards</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100/80 text-[10px] uppercase font-mono font-black text-slate-500 rounded-lg">
                  Max 50 Rows
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
                  ))
                ) : transactions.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                      <Coins className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">No activity logs recorded yet</p>
                    <p className="text-xs text-slate-450 mt-1 max-w-xs">Attempt mock interviews or claim daily rewards to generate entries.</p>
                  </div>
                ) : (
                  transactions.map((t, i) => {
                    const isCredit = t.amount > 0;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4) }}
                        key={t.id} 
                        className="flex items-center justify-between p-4 bg-slate-50/45 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-slate-200/60 transition-all group cursor-default"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isCredit 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100/50' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100 group-hover:bg-rose-100/50'
                          }`}>
                            {isCredit ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-950 transition-colors">
                              {t.description || t.type.replace('_', ' ')}
                            </p>
                            <p className="text-[10px] text-slate-450 font-mono font-black uppercase mt-1 flex items-center gap-1.5">
                              <span>{parseLocalDate(t.created_at).toLocaleDateString()}</span>
                              <span className="text-slate-300">•</span>
                              <span>{parseLocalDate(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-300">•</span>
                              <span className="px-1.5 py-0.2 bg-slate-200/50 text-slate-500 rounded text-[8px] font-bold font-mono tracking-wide">{t.type}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`text-sm font-black font-mono tabular-nums px-3 py-1 rounded-lg ${
                          isCredit 
                          ? 'text-emerald-600 bg-emerald-500/5' 
                          : 'text-rose-600 bg-rose-500/5'
                        }`}>
                          {isCredit ? '+' : ''}{t.amount} XP
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Info Panel (Column Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Visual Store/Upsell Banner */}
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden shadow-xl border border-indigo-900">
              <Sparkles className="absolute -top-4 -right-4 w-32 h-32 opacity-15 rotate-12 pointer-events-none" />
              <div className="relative space-y-6">
                <div>
                  <span className="px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[9px] uppercase font-black tracking-wider border border-white/10">
                    Premium Upgrades
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold mt-3 tracking-tight">Need More XP?</h3>
                  <p className="text-indigo-150 text-xs mt-1.5 leading-relaxed font-semibold text-indigo-200/80">
                    Unlock limitless mock interviews and premium resume analysis by powering up your wallet.
                  </p>
                </div>

                <div className="space-y-2.5 py-2">
                  <BenefitItem text="125 XP = 1 AI Session" />
                  <BenefitItem text="Priority AI Processing Queue" />
                  <BenefitItem text="Deep Analytic Insight Reports" />
                </div>

                <button 
                  onClick={() => window.location.href = '/xp-store'}
                  className="w-full py-3.5 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 shadow-lg hover:shadow-indigo-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#fff]"
                >
                  <span>Visit VEGA Rewards Center</span>
                  <ArrowUpRight size={14} className="text-indigo-700" />
                </button>
              </div>
            </div>

            {/* Economy Guidelines Section */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Info className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Economy Rules</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">How to preserve balance</p>
                </div>
              </div>
              
              <ul className="space-y-4">
                <li className="flex gap-3 text-xs text-slate-650 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0 shadow-sm shadow-indigo-500" />
                  <span>Referrals are credited automatically once the invite link registration is fully finalized.</span>
                </li>
                <li className="flex gap-3 text-xs text-slate-650 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0 shadow-sm shadow-indigo-500" />
                  <span>Daily login rewards are claimed once every 24 hours to maintain your career streak.</span>
                </li>
                <li className="flex gap-3 text-xs text-slate-650 leading-relaxed font-medium">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0 shadow-sm shadow-indigo-500" />
                  <span>Mock interviews and performance evaluations deduct standard rate (125 XP) upon commencement.</span>
                </li>
              </ul>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <AlertCircle size={12} className="text-slate-400" />
                <span>Standard rates and limits are non-negotiable.</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsBox({ label, value, icon, suffix = "", sub = "", colorTheme = "blue" }: any) {
  const isEmerald = colorTheme === "emerald";
  const isRose = colorTheme === "rose";
  
  return (
    <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-250 cursor-default group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
          <div className={`p-2 rounded-lg transition-colors ${
            isEmerald ? 'bg-emerald-50' : isRose ? 'bg-rose-50' : 'bg-blue-50'
          }`}>
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {suffix && <span className="text-xs font-black text-slate-400 uppercase tracking-wide">{suffix}</span>}
        </div>
      </div>
      
      {sub && (
        <p className="text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-wide border-t border-slate-50 pt-2 font-mono">
          {sub}
        </p>
      )}
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/5">
        <TrendingUp className="w-2.5 h-2.5 text-indigo-300" />
      </div>
      <span className="text-xs font-medium text-indigo-100">{text}</span>
    </div>
  );
}

