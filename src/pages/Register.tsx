import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { useAccessibility } from "../context/AccessibilityContext.tsx";
import api from "../services/api.ts";
import { motion } from "motion/react";
import { UserPlus, ArrowRight, ShieldCheck, Mail, Lock, Building, CheckCircle2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { setPageContext } = useAccessibility();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "STUDENT") navigate("/student");
      else if (user.role === "COMPANY") navigate("/company");
      else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") navigate("/admin");
    }
  }, [user, loading, navigate]);

  const formik = useFormik({
    initialValues: { email: "", password: "", role: "STUDENT", companyName: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email").required("Required"),
      password: Yup.string()
        .min(8, "Minimum 8 characters")
        .matches(/[a-z]/, "Must include lowercase")
        .matches(/[A-Z]/, "Must include uppercase")
        .matches(/[0-9]/, "Must include number")
        .matches(/[@$!%*?&]/, "Must include special character")
        .required("Required"),
      role: Yup.string().required("Required"),
      companyName: Yup.string().when("role", {
        is: "COMPANY",
        then: (schema) => schema.required("Company name is required")
          .test("no-only-special", "Please enter a valid business name.", (value) => {
            if (!value) return true;
            const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
            const hasAlphanumeric = /[a-zA-Z0-9]/.test(value);
            return allowedRegex.test(value) && hasAlphanumeric;
          }),
        otherwise: (schema) => schema.optional()
      })
    }),
    onSubmit: async (values) => {
      try {
        const { data } = await api.post("/auth/register", values);
        if (data.success) {
          toast.success(data.message);
          const verifyPath = `/verify-email?email=${encodeURIComponent(values.email)}`;
          navigate(verifyPath);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Registration failed");
      }
    },
  });

  useEffect(() => {
    if (setPageContext) {
      setPageContext({
        page: "Register",
        description: "Join VEGA by creating an account. Specify your role (Student or Company), email, and password.",
        actions: {
          setFieldValue: (field: string, value: string) => formik.setFieldValue(field, value),
          submit: () => formik.submitForm(),
          login: () => navigate("/login")
        }
      });
    }
    return () => setPageContext?.(null);
  }, [setPageContext, navigate, formik.submitForm, formik.setFieldValue]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row-reverse border border-slate-100">
        
        {/* Left Side (Actually Right on Desktop) - Graphic/Info */}
        <div className="w-full md:w-1/2 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold tracking-tight mb-6">Join the Future<br/>of Hiring</h2>
            <p className="text-slate-300 text-lg font-medium leading-relaxed mb-8 max-w-sm">
              Create an account to discover opportunities, track applications, and grow your career with data-driven insights.
            </p>
            
            <div className="space-y-4">
               {[
                 { icon: <CheckCircle2 size={20} className="text-emerald-400"/>, text: "AI-Powered Parsing" },
                 { icon: <CheckCircle2 size={20} className="text-emerald-400"/>, text: "Real-time Tracking" },
                 { icon: <CheckCircle2 size={20} className="text-emerald-400"/>, text: "Skill Verification" },
               ].map((feature, i) => (
                 <div key={i} className="flex items-center gap-3">
                   {feature.icon}
                   <span className="font-semibold text-slate-200">{feature.text}</span>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="relative z-10 mt-12 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
             <div className="flex -space-x-3 mb-4">
               {[1,2,3,4].map((i) => (
                 <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-xs shadow-sm`}>
                    U{i}
                 </div>
               ))}
               <div className="w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-700 font-bold text-xs text-white">
                 +2k
               </div>
             </div>
             <p className="text-sm font-medium text-slate-300">Join thousands of students and companies actively connecting on VEGA today.</p>
          </div>
        </div>

        {/* Right Side (Actually Left on Desktop) - Form */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 bg-white flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Create Account</h2>
            <p className="text-slate-500 font-medium mt-2">Get started for free. No credit card required.</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  formik.setFieldValue("role", "STUDENT");
                  formik.setFieldValue("companyName", ""); // Reset so it doesn't leave lingering errors
                }}
                className={`py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${formik.values.role === "STUDENT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => formik.setFieldValue("role", "COMPANY")}
                className={`py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${formik.values.role === "COMPANY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Company
              </button>
            </div>

            {formik.values.role === "COMPANY" && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Company Name</label>
                <div className="relative group">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input
                    type="text"
                    {...formik.getFieldProps("companyName")}
                    className={`w-full bg-slate-50 border ${formik.touched.companyName && formik.errors.companyName ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-slate-900 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium`}
                    placeholder="Acme Corp."
                  />
                </div>
                {formik.touched.companyName && formik.errors.companyName && (
                  <div className="text-red-500 text-xs font-semibold pl-1">{formik.errors.companyName}</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="email"
                  {...formik.getFieldProps("email")}
                  className={`w-full bg-slate-50 border ${formik.touched.email && formik.errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-slate-900 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium`}
                  placeholder="name@example.com"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-xs font-semibold pl-1">{formik.errors.email}</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...formik.getFieldProps("password")}
                  className={`w-full bg-slate-50 border ${formik.touched.password && formik.errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'} text-slate-900 rounded-xl py-3.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium`}
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

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 mt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "8+ Characters", met: formik.values.password.length >= 8 },
                  { label: "Uppercase", met: /[A-Z]/.test(formik.values.password) },
                  { label: "Number", met: /\d/.test(formik.values.password) },
                  { label: "Special Char", met: /[@$!%*?&]/.test(formik.values.password) }
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${req.met ? "bg-indigo-500 border-indigo-500" : "border-slate-200"}`}>
                      {req.met && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${req.met ? "text-indigo-600" : "text-slate-400"}`}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={formik.isSubmitting}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase text-sm tracking-wide shadow-xl shadow-slate-900/20 hover:shadow-slate-800/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {formik.isSubmitting ? "Creating Account..." : "Create Account"} 
              {!formik.isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-center mt-8 text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-slate-900 font-bold hover:underline transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
