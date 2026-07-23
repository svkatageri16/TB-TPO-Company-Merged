import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState(searchParams.get("otp") || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Please enter a 6-digit code");

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, code });
      if (data.success) {
        toast.success(data.message);
        navigate("/login");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const { data } = await api.post("/auth/send-otp", { email });
      if (data.success) {
        toast.success(data.message);
        if (data.otp) {
          toast.success(`Development Only: OTP is ${data.otp}`, { duration: 6000 });
        }
        setCooldown(60); 
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 border border-slate-200 shadow-xl"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6 border border-indigo-100">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Verify Email</h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            We've sent a 6-digit verification code to <br />
            <span className="text-indigo-600 font-black">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono text-2xl tracking-[0.5em] text-center"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : "Verify Account"}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-10 text-center pt-8 border-t border-slate-100">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {resending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
