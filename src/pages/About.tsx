import { motion } from "motion/react";
import { 
  BrainCircuit, 
  Target, 
  Users, 
  Rocket, 
  Award, 
  ShieldCheck, 
  Briefcase, 
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: "indigo" | "emerald" | "purple";
  delay: number;
}

function ValueCard({ icon, title, desc, color, delay }: ValueCardProps) {
  const colors = {
    indigo: "from-indigo-500/10 to-indigo-600/5 text-indigo-600 border-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    emerald: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    purple: "from-purple-500/10 to-purple-600/5 text-purple-600 border-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`bg-white/90 backdrop-blur-md border rounded-3xl p-8 flex flex-col gap-5 shadow-[0_10px_35px_rgba(0,0,0,0.02)] transition-all`}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </motion.div>
  );
}

export function About() {
  const milestones = [
    {
      year: "2024",
      title: "Platform Conception",
      desc: "VEGA was envisioned to empower regional tech hubs and local universities with high-tech tooling."
    },
    {
      year: "2025",
      title: "AI Integration",
      desc: "Built custom resume parsers, interview coaching, and automated intelligence testing pipelines."
    },
    {
      year: "2026",
      title: "Scale to 450+ Partners",
      desc: "Delivered direct candidate matching pipelines to enterprise partners in Pune, Mumbai, Solapur, and Bangalore."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#fafbff] selection:bg-indigo-200 selection:text-indigo-900 overflow-hidden pt-28 pb-20">
      {/* Dynamic Ambient Background Blur */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-300/20 via-purple-300/5 to-transparent blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-[-10%] w-[500px] h-[500px] bg-emerald-300/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_80%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-50 border border-indigo-100 rounded-full mb-6 shadow-sm"
          >
            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-700">About Our Purpose</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6"
            style={{ fontFamily: "Sora, DM Sans, sans-serif" }}
          >
            Bridging Potential <br />
            with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Opportunity</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base sm:text-lg text-slate-500 leading-relaxed font-semibold max-w-2xl mx-auto"
          >
            VEGA is built with love to support students, universities, and growing enterprises in Solapur and beyond. We replace archaic boards with responsive AI matching.
          </motion.p>
        </div>

        {/* MISSION & VISION BENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="group relative bg-white/70 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-10 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(99,102,241,0.1)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6 group-hover:rotate-6 transition-transform">
                <Target size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Our Mission</h2>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium mb-6">
                Most students in regional sectors have world-class technical talent but limited channels to present it. We democratize recruitment. Our mission is to provide continuous mock simulation assessments, real-world portfolio validations, and instantaneous pipelines to high-growth tech companies.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-wider">
                Focused on Growth <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="group relative bg-white/70 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-10 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_60px_rgba(16,185,129,0.1)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:rotate-6 transition-transform">
                <BrainCircuit size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Our Core Vision</h2>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium mb-6">
                We believe matching is about skill alignment, mindset integration, and localized scalability. We visualize a simplified ecosystem: academic institutions safely audit compliance directories, companies source without bloated manual evaluation cycles, and candidates acquire continuous daily wisdom metrics.
              </p>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase tracking-wider">
                Unbiased Evaluation <Zap size={16} className="text-amber-500" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* THREE CORE PILLARS / VALUES */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Our Dynamic Foundations</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">These values hold our framework upright and guide our design principles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ValueCard 
              icon={<BrainCircuit size={26} />} 
              title="Intelligence-Driven" 
              desc="We build deep interactive models powered by advanced analytics to help students study smart, rewrite resumes to hit target ATS levels, and master physical mock environments." 
              color="indigo" 
              delay={0}
            />
            <ValueCard 
              icon={<ShieldCheck size={26} />} 
              title="Trust & Verification" 
              desc="We counter the threat of fabricated credentials. Academic certifications, actual exam logs, and validated XP points are securely tracked, and always authentic." 
              color="emerald" 
              delay={0.1}
            />
            <ValueCard 
              icon={<Users size={26} />} 
              title="Hyperlocal and Global" 
              desc="Enabling students from Solapur, Kolhapur and central regions to access Tier-1 engineering placements and Remote tech roles globally without dynamic travel friction." 
              color="purple" 
              delay={0.2}
            />
          </div>
        </div>

        {/* TIMELINE SECTION */}
        <div className="bg-white/50 border border-white/60 rounded-[2.5rem] p-10 md:p-14 shadow-sm mb-24 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 blur-[100px] -z-10" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">The Growth Timeline</h2>
          
          <div className="relative border-l-2 border-slate-100 ml-4 md:ml-32 md:pl-20 pl-8 space-y-12">
            {milestones.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative"
              >
                {/* Year Indicator on Left for Larger Screens */}
                <span className="hidden md:block absolute right-full mr-24 top-1 text-xl font-black text-indigo-600 text-right w-28">
                  {m.year}
                </span>

                {/* Bullets */}
                <div className="absolute left-[-12px] md:left-[-92px] top-1.5 w-6 h-6 rounded-full bg-white border-4 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] flex items-center justify-center text-[10px] text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>

                <div>
                  <span className="md:hidden inline-block text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2">
                    {m.year}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-2">
                    {m.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-semibold max-w-2xl">
                    {m.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-slate-900 rounded-[2.5rem] p-10 md:p-14 text-center text-white overflow-hidden shadow-[0_20px_50px_rgba(9,15,30,0.5)]"
        >
          {/* Cosmic Glows */}
          <div className="absolute top-[-50%] left-[-20%] w-[400px] h-[400px] rounded-full bg-indigo-600/30 blur-[100px]" />
          <div className="absolute bottom-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full bg-emerald-600/20 blur-[100px]" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              Write your next <br />
              professional success story.
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-semibold mb-10 leading-relaxed">
              Unlock free dynamic AI resume builders, simulated interviews, and immediate placement matching pipelines today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-500 transition-all hover:scale-105"
              >
                Join as Student <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/companyregister"
                className="flex items-center gap-3 px-8 py-4 bg-white/15 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold text-sm hover:bg-white/25 transition-all hover:scale-105"
              >
                Hire with Us <Briefcase size={18} />
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

