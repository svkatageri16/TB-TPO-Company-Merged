import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Lock, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { userId, email } = location.state || {};

  if (!userId) {
    navigate('/login');
    return null;
  }

  const formik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Required'),
      newPassword: Yup.string()
        .required('Required')
        .min(8, 'Must be at least 8 characters')
        .matches(/[a-z]/, 'Must contain lowercase')
        .matches(/[A-Z]/, 'Must contain uppercase')
        .matches(/\d/, 'Must contain number')
        .matches(/[@$!%*?&]/, 'Must contain special character'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
        .required('Required')
    }),
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await api.post('/auth/change-password', {
          userId,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        });
        if (res.data.success) {
          toast.success('Password updated successfully! Please login with your new password.');
          navigate('/login');
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error updating password');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Security Update</h2>
          <p className="text-slate-500 font-medium text-sm mt-2">
            This is your first login. For security reasons, you must change your temporary password.
          </p>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="currentPassword"
                type={showPassword ? "text" : "password"}
                className="w-full pl-12 pr-12 py-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500"
                {...formik.getFieldProps('currentPassword')}
              />
            </div>
            {formik.touched.currentPassword && formik.errors.currentPassword && (
              <p className="text-xs text-red-500 font-bold">{formik.errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="newPassword"
                type={showPassword ? "text" : "password"}
                className="w-full pl-12 pr-12 py-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500"
                {...formik.getFieldProps('newPassword')}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formik.touched.newPassword && formik.errors.newPassword && (
              <p className="text-xs text-red-500 font-bold">{formik.errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="w-full pl-12 pr-12 py-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500"
                {...formik.getFieldProps('confirmPassword')}
              />
            </div>
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <p className="text-xs text-red-500 font-bold">{formik.errors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
            <ShieldCheck className="text-blue-600 shrink-0" size={18} />
            <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase tracking-wider">
              Must include: 8+ chars, uppercase, lowercase, number, and special character.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Updating...' : (
              <>
                Update Password
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
