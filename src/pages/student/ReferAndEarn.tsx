import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Gift, Copy, CheckCircle2, Share2, Users, Trophy, Sparkles, 
  ArrowRight, Shield, Check, HelpCircle, UserPlus, Coins, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { xpService } from '../../services/xpService.ts';
import api from '../../services/api.ts';

interface Referral {
  id: number;
  referred_user_id: number;
  referred_email: string;
  created_at: string;
}

export function ReferAndEarn() {
  const [copied, setCopied] = useState(false);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [balanceRes, referralsRes] = await Promise.all([
        xpService.getBalance(),
        api.get('/xp/referrals')
      ]);
      setBalanceData(balanceRes.balance);
      if (referralsRes.data?.success) {
        setReferrals(referralsRes.data.referrals || []);
      }
    } catch (err) {
      console.error("Error loading referral page details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const referralCode = balanceData?.referral_code || "TALENT" + Math.floor(1000 + Math.random() * 9000);
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

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
          text: `Use my referral code "${referralCode}" to join VEGA, gain bonus XP, and ace your placements!`,
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const formatEmail = (email: string) => {
    if (!email) return "";
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.substring(0, 3)}***@${domain}`;
  };

  const steps = [
    {
      step: "01",
      icon: Share2,
      title: "Share Invite Link",
      desc: "Send your custom invite link or copy your referral code to send to your college friends.",
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      step: "02",
      icon: UserPlus,
      title: "Friends Join Up",
      desc: "Your friends join the platform using your referral link, automatically linking them as your referral.",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    },
    {
      step: "03",
      icon: Coins,
      title: "Both of You Earn!",
      desc: "You receive 60 XP instantly per friend. They get a premium platform starter bonus to access AI Mock Interviews!",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 font-sans text-slate-800">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-[2rem] p-8 md:p-12 border border-slate-800 shadow-2xl mb-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">VEGA Affiliation</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Refer Friends <br className="hidden md:inline" /> & Earn <span className="text-indigo-400 font-extrabold">Unlimited XP</span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base font-medium max-w-lg leading-relaxed">
              Help your friends prepare for placements with top-tier AI Resume builders, personalized mock interviews, and assessment tests. For every friend who registers, you claim 60 XP instantly!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <div className="flex bg-slate-950/80 rounded-2xl border border-slate-800 p-1 w-full max-w-sm">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink}
                  className="bg-transparent border-none focus:ring-0 text-slate-350 text-xs font-mono flex-1 px-4 py-2.5 overflow-hidden text-ellipsis whitespace-nowrap outline-none"
                />
                <button 
                  onClick={handleCopy}
                  className="px-5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              <button 
                onClick={handleShare}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <Share2 size={14} className="text-indigo-400" />
                Share Directly
              </button>
            </div>
          </div>

          {/* Quick Statistics Right Cards */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-[#12182c]/80 border border-[#212f5a]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4">
                <Users size={18} />
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Friends Referred</p>
              <h3 className="text-2xl font-black text-slate-100">{loading ? "..." : referrals.length}</h3>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">Successfully joined</p>
            </div>

            <div className="bg-[#12182c]/80 border border-[#212f5a]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 mb-4 animate-bounce">
                <Trophy size={18} />
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">XP Points Earned</p>
              <h3 className="text-2xl font-black text-amber-400">{loading ? "..." : referrals.length * 60}</h3>
              <p className="text-[9px] text-zinc-500 font-bold mt-1">Wallet value added</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left main: Steps and FAQ */}
        <div className="lg:col-span-8 space-y-8">
          {/* How it works Section */}
          <div className="bg-white rounded-3xl p-8 border border-slate-150/80 shadow-md">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <Gift className="text-indigo-600 animate-pulse" /> How The Affiliate System Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div key={idx} className="relative group p-5 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${s.color}`}>
                          <Icon size={18} />
                        </div>
                        <span className="text-2xl font-bold text-slate-200">{s.step}</span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mb-2">{s.title}</h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-white rounded-3xl p-8 border border-slate-150/80 shadow-md">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <HelpCircle className="text-indigo-600" /> Referral program FAQs
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">How many friends can I invite?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">There is absolutely no limit! You can invite as many classmates, college peers, or friends as you wish. If 10 friends join, you pocket 600 XP instantly.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">When do I receive my 60 XP points?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">The 60 XP referral reward is applied directly to your current XP balance immediately once they complete registration on VEGA using your referral URL.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">What can I purchase with my earned XP?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">You can visit the <b>VEGA Rewards Center</b> to redeem your XP for highly valuable AI Mock Inteviews, professional AI Resume evaluations, coding assessment tokens, and exclusive premium coursewares.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Refferal History list */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-150/80 shadow-md">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-600" /> Referral History
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 rounded-full font-bold uppercase">{referrals.length} Peer{referrals.length !== 1 ? "s" : ""}</span>
          </div>

          {referrals.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-3 text-slate-200 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider">No referrals logged yet</p>
              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto mt-1">Copy and share your personal registration URL to invite your peers.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {referrals.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2.5 hover:border-indigo-100 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 truncate">{formatEmail(item.referred_email)}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-xl">
                    <span className="text-[10px] font-black leading-none">+60</span>
                    <span className="text-[8px] font-black uppercase">XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guarantee Security Guard badge */}
          <div className="mt-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-0.5">Anti-Abuse Verification</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Multiple dummy account registrations are automatically flagged. Legit invites ensure prompt withdrawals and redemption safety.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ReferAndEarn;
