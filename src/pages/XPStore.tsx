import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Coins, CheckCircle2, Zap, Trophy, Crown, Loader2, Sparkles } from 'lucide-react';
import { xpService } from '../services/xpService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.tsx';

export const XPStore: React.FC = () => {
  const [loading, setLoading] = useState<string | number | null>(null);
  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchBalance();
    fetchPackages();
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await xpService.getBalance();
      setBalance(data.balance.xp_balance);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await xpService.getPackages();
      if (res.success && Array.isArray(res.packages)) {
        setPackages(res.packages);
      }
    } catch (err) {
      console.error("Error loading packages:", err);
    } finally {
      setLoadingPackages(false);
    }
  };

  const displayPackages = packages.length > 0 ? packages : [
    { id: 'starter', xp_amount: 500, price_inr: 99, name: 'Starter Pack', is_popular: false, is_best_value: false, mock_interviews_included: 4, resume_reviews_included: 10 },
    { id: 'popular', xp_amount: 1200, price_inr: 199, name: 'Value Pack', is_popular: true, is_best_value: false, mock_interviews_included: 9, resume_reviews_included: 24 },
    { id: 'premium', xp_amount: 2500, price_inr: 399, name: 'Elite Pack', is_popular: false, is_best_value: true, mock_interviews_included: 20, resume_reviews_included: 50 },
  ];

  const getPackageStyles = (pkg: any, idx: number) => {
    if (pkg.is_popular) {
      return { icon: Trophy, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-orange-500/10' };
    }
    if (pkg.is_best_value) {
      return { icon: Crown, color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/10' };
    }
    if (idx === 0) {
      return { icon: Zap, color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/10' };
    }
    return { icon: Zap, color: 'text-teal-400', bg: 'from-teal-500/20 to-emerald-500/10' };
  };

  const handlePurchase = async (pkg: any) => {
    const pkgId = pkg.id || 'custom';
    setLoading(pkgId);
    try {
      const { order } = await xpService.createOrder(pkg.price_inr, pkg.xp_amount);
      
      const options = {
        key: (((import.meta as any).env.VITE_RAZORPAY_KEY_ID || '').trim().replace(/^["']|["']$/g, '')) || 'rzp_test_your_key_id',
        amount: order.amount,
        currency: order.currency,
        name: 'VEGA',
        description: `Purchase ${pkg.xp_amount} XP Points`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await xpService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success(`${pkg.xp_amount} XP added to your wallet!`);
            fetchBalance();
            window.dispatchEvent(new CustomEvent('xp_updated'));
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Verification failed");
          }
        },
        prefill: {
          name: profile?.full_name || profile?.company_name || '',
          email: user?.email || '',
          contact: profile?.contact || profile?.phone || '',
        },
        theme: {
          color: '#2563EB',
        },
      };
 
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 font-sans text-slate-800">
      <div className="w-full">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                <Coins size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">VEGA Rewards Center</h1>
                <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">PREMIUM AI UTILITIES MARKETPLACE</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3.5 flex items-center gap-3 self-stretch md:self-auto justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-100 rounded-xl">
                <Coins className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Current Balance</p>
                <p className="text-xl font-black text-slate-800 leading-none">{balance} <span className="text-yellow-600 text-[10px] font-extrabold uppercase">XP</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {loadingPackages ? (
            <div className="md:col-span-3 flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
            </div>
          ) : (
            displayPackages.map((pkg, idx) => {
              const styles = getPackageStyles(pkg, idx);
              const IconComp = styles.icon;
              return (
                <motion.div
                  key={pkg.id || idx}
                  whileHover={{ y: -5 }}
                  className={`relative bg-white border ${pkg.is_popular ? 'border-yellow-400 shadow-xl shadow-yellow-500/10 scale-[1.02]' : pkg.is_best_value ? 'border-purple-300 shadow-lg' : 'border-slate-200 shadow-md'} rounded-3xl p-8 flex flex-col overflow-hidden`}
                >
                  {pkg.is_popular ? (
                    <div className="absolute top-4 right-4 bg-yellow-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-yellow-500/20">
                      Popular
                    </div>
                  ) : null}
                  {pkg.is_best_value ? (
                    <div className="absolute top-4 right-4 bg-purple-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-purple-500/20">
                      Best Value
                    </div>
                  ) : null}

                  <div className={`w-12 h-12 rounded-2xl mb-6 bg-gradient-to-br ${styles.bg} flex items-center justify-center`}>
                    <IconComp className={`w-6 h-6 ${styles.color}`} />
                  </div>

                  <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">
                    {pkg.name || (pkg.is_popular ? 'Value Pack' : pkg.is_best_value ? 'Elite Pack' : 'Starter Pack')}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-black text-slate-800">{pkg.xp_amount}</span>
                    <span className="text-slate-400 font-bold">XP</span>
                  </div>

                  <div className="mb-8 space-y-4 flex-1">
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>
                        {pkg.mock_interviews_included !== undefined && pkg.mock_interviews_included !== null
                          ? pkg.mock_interviews_included
                          : Math.floor(pkg.xp_amount / 125)}{" "}
                        Mock Interviews
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>
                        {pkg.resume_reviews_included !== undefined && pkg.resume_reviews_included !== null
                          ? pkg.resume_reviews_included
                          : Math.floor(pkg.xp_amount / 50)}{" "}
                        Resume Reviews
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>Instant Credit</span>
                    </div>
                  </div>

                  <button
                    disabled={loading !== null}
                    onClick={() => handlePurchase(pkg)}
                    className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-3 ${
                      pkg.is_popular 
                      ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 shadow-xl shadow-yellow-500/20 active:scale-95' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 active:scale-95'
                    }`}
                  >
                    {loading === (pkg.id || 'custom') ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>₹{pkg.price_inr}</>
                    )}
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="mt-12 bg-indigo-50 border border-indigo-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">Earning is easy!</h2>
              <p className="text-slate-600 font-medium max-w-md">Maintain a login streak or refer friends to earn XP without spending any money.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = "/student"}
            className="whitespace-nowrap px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
          >
            Check Rewards
          </button>
        </div>
      </div>
    </div>
  );
};
