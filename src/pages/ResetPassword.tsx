import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, ArrowRight, KeyRound, RefreshCw, Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(searchParams.get("token") || "");
  const [email] = useState(searchParams.get("email") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return toast.error("Password must include uppercase, lowercase, number, and special character.");
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { email, token, newPassword });
      if (data.success) {
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
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
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-6 border border-emerald-100">
            <KeyRound size={36} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Reset Password</h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Create a strong, new password to secure your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Checklist</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "8+ Characters", met: newPassword.length >= 8 },
                { label: "Uppercase", met: /[A-Z]/.test(newPassword) },
                { label: "Number", met: /\d/.test(newPassword) },
                { label: "Special Char", met: /[@$!%*?&]/.test(newPassword) }
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${req.met ? "bg-emerald-500 border-emerald-500" : "border-slate-200"}`}>
                    {req.met && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${req.met ? "text-emerald-600" : "text-slate-300"}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : "Update Password"}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
