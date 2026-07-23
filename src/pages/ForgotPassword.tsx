import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowRight, LifeBuoy, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.success) {
        toast.success(data.message);
        if (data.resetLink) {
           toast.success(`Development Only: Reset Link is ${data.resetLink}`, { duration: 10000 });
        }
        setSent(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
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
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6 border border-blue-100">
            <LifeBuoy size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Recovery</h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Enter your email and we'll send you a secure link to reset your password.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : "Send Reset Link"}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center">
            <p className="text-emerald-700 font-black uppercase text-xs tracking-widest mb-2">Email Sent!</p>
            <p className="text-emerald-600/80 text-xs font-medium mb-6">Check your inbox for further instructions. Don't forget to check your spam folder.</p>
            <button onClick={() => setSent(false)} className="text-emerald-700 font-black uppercase text-[10px] tracking-widest hover:underline">
              Try a different email
            </button>
          </div>
        )}

        <div className="mt-10 text-center pt-8 border-t border-slate-100">
          <Link to="/login" className="text-slate-400 hover:text-slate-600 font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
