import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { motion } from "motion/react";
import { 
  Code2, CheckCircle2, ChevronRight, Terminal, Database, ShieldCheck, 
  ArrowRight, ExternalLink, Activity, Network
} from "lucide-react";

const PLATFORMS = [
  { id: "leetcode", name: "LeetCode", icon: Code2, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", example: "https://leetcode.com/username" },
  { id: "codechef", name: "CodeChef", icon: Terminal, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", example: "https://www.codechef.com/users/username" },
  { id: "hackerrank", name: "HackerRank", icon: Network, color: "text-green-600", bg: "bg-green-50", border: "border-green-100", example: "https://www.hackerrank.com/username" },
  { id: "gfg", name: "GeeksForGeeks", icon: Database, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", example: "https://auth.geeksforgeeks.org/user/username" },
  { id: "codeforces", name: "Codeforces", icon: Activity, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", example: "https://codeforces.com/profile/username" },
];

export function CodingConnectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [connectedProfiles, setConnectedProfiles] = useState<any[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    try {
      const res = await api.get(`/coding/profiles/${user?.id}`);
      if (res.data?.success) {
        setConnectedProfiles(res.data.profiles);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !profileUrl) {
      setError("Please select a platform and enter your profile URL.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/coding/connect", {
        userId: user?.id,
        platform,
        profileUrl
      });

      if (res.data.success) {
        setSuccess(res.data.message);
        setPlatform("");
        setProfileUrl("");
        fetchProfiles();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(res.data.message || "Failed to connect profile.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-2">
            <Code2 size={36} className="text-indigo-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI Coding Intelligence</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Connect your competitive programming profiles. Let our AI analyze your problem-solving skills, assess your DSA readiness, and generate powerful analytics for top tech recruiters.
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
            <ShieldCheck className="text-red-500" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Connection Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50" />
            
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              Add New Profile
            </h2>

            <form onSubmit={handleConnect} className="space-y-6">
              
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">Select Platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                          isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={24} className={`mb-2 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${isSelected ? 'text-indigo-800' : 'text-slate-600'}`}>{p.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">Profile URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder={PLATFORMS.find(p => p.id === platform)?.example || "e.g. https://leetcode.com/username"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !platform || !profileUrl}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Connect Profile"}
              </button>
            </form>
          </motion.div>

          {/* Connected Profiles List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Connected Profiles</h2>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                {connectedProfiles.length} Linked
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {connectedProfiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Database size={32} />
                  </div>
                  <p className="font-medium">No profiles connected yet.</p>
                  <p className="text-sm">Link your competitive programming accounts to unlock AI analytics.</p>
                </div>
              ) : (
                connectedProfiles.map((cp) => {
                  const platInfo = PLATFORMS.find(p => p.id === cp.platform) || PLATFORMS[0];
                  const Icon = platInfo.icon;
                  return (
                    <div key={cp.id} className={`p-4 rounded-2xl border ${platInfo.border} ${platInfo.bg} flex items-center justify-between group`}>
                      <div className="flex items-center gap-4 relative">
                         <div className="bg-white p-2.5 rounded-xl shadow-sm">
                           <Icon size={20} className={platInfo.color} />
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                             <h3 className="font-bold text-slate-800">{platInfo.name}</h3>
                             {cp.is_verified ? <CheckCircle2 size={14} className="text-emerald-500" /> : null}
                           </div>
                           <a href={cp.profile_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                             @{cp.username} <ExternalLink size={12} />
                           </a>
                         </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block mb-1">Last synced</span>
                        <span className="text-xs font-medium text-slate-600">{new Date(cp.last_synced_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {connectedProfiles.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => navigate('/coding-analytics')}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  View My AI Analytics <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
