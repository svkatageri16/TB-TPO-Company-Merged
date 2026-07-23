import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { useAccessibility } from "../context/AccessibilityContext.tsx";
import api from "../services/api.ts";
import { motion } from "motion/react";
import { LogIn, HelpCircle, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export function Login() {
  const { login, user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const { setPageContext } = useAccessibility();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "STUDENT") {
        if (!profile || profile.onboarding_completed === 0 || (profile.completeness_score || 0) < 70) {
          navigate("/profile");
        } else {
          navigate("/student");
        }
      }
      else if (user.role === "COMPANY") navigate("/company");
      else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") navigate("/admin");
    }
  }, [user, loading, profile, navigate]);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email").required("Required"),
      password: Yup.string().required("Required"),
    }),
    onSubmit: async (values) => {
      try {
        const { data } = await api.post("/auth/login", values);
        if (data.success) {
          if (data.data.requiresPasswordChange) {
            toast.success("Login successful. Security check required.");
            navigate("/force-password-change", { 
              state: { userId: data.data.user.id, email: data.data.user.email } 
            });
            return;
          }
          toast.success("Login successful!");
          login(data.data);
          const role = data.data.user.role;
          if (role === "STUDENT") {
            const p = data.data.profile;
            if (!p || p.onboarding_completed === 0 || (p.completeness_score || 0) < 70) {
              navigate("/profile");
            } else {
              navigate("/student");
            }
          }
          else if (role === "COMPANY") navigate("/company");
          else if (role === "TPO") navigate("/tpo");
          else if (role === "ADMIN" || role === "SUPER_ADMIN") navigate("/admin");
          else navigate("/");
        }
      } catch (err: any) {
        if (err.response?.data?.requiresVerification) {
          toast.error("Please verify your email address first.");
          navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
        } else {
          toast.error(err.response?.data?.message || "Invalid credentials");
        }
      }
    },
  });

  useEffect(() => {
    if (setPageContext) {
      setPageContext({
        page: "Login",
        description: "Registration and login assistance. Provide email and password to sign in.",
        actions: {
          register: () => navigate("/register"),
          forgotPassword: () => navigate("/forgot-password"),
          setFieldValue: (field: string, value: string) => formik.setFieldValue(field, value),
          submit: () => formik.submitForm(),
        }
      });
    }
    return () => setPageContext?.(null);
  }, [setPageContext, navigate, formik.submitForm, formik.setFieldValue]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        
        {/* Left Side - Graphic/Info */}
        <div className="w-full md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold tracking-tight mb-6">Unlock Your<br/>Career Potential</h2>
            <p className="text-blue-100 text-lg font-medium leading-relaxed mb-8 max-w-sm">
              Connect with top companies, build your profile, and fast-track your hiring process all in one place.
            </p>
            
            <div className="space-y-4">
               {[
                 { icon: <ShieldCheck size={20} className="text-blue-300"/>, text: "Verified Companies" },
                 { icon: <LogIn size={20} className="text-blue-300"/>, text: "One-Click Apply" },
               ].map((feature, i) => (
                 <div key={i} className="flex items-center gap-3">
                   {feature.icon}
                   <span className="font-semibold">{feature.text}</span>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="relative z-10 mt-12 bg-blue-700/50 p-6 rounded-2xl border border-blue-500/30 backdrop-blur-sm">
            <p className="text-sm font-medium text-blue-100">"VEGA helped me find my dream job in just two weeks. The platform is incredibly intuitive."</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">JD</div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Jane Doe • Software Engineer</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 bg-white flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 font-medium mt-2">Sign in to your VEGA account</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="email"
                  {...formik.getFieldProps("email")}
                  className={`w-full bg-white border login-input ${formik.touched.email && formik.errors.email ? 'border-red-500 bg-red-50' : 'border-blue-500'} text-black rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium`}
                  placeholder="name@company.com"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-xs font-semibold pl-1">{formik.errors.email}</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between pl-1">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                 <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline">
                   Forgot Password?
                 </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...formik.getFieldProps("password")}
                  className={`w-full bg-white border login-input ${formik.touched.password && formik.errors.password ? 'border-red-500 bg-red-50' : 'border-blue-500'} text-black rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="text-red-500 text-xs font-semibold pl-1">{formik.errors.password}</div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={formik.isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase text-sm tracking-wide shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {formik.isSubmitting ? "Signing In..." : "Sign In"}
              {!formik.isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-center mt-10 text-sm font-medium text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-bold hover:underline transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
