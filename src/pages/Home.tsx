import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Zap,
  ShieldCheck,
  Globe2,
  Sparkles,
  Users,
  Briefcase,
  TrendingUp,
  Star,
  BarChart3,
  MessageSquare,
  ChevronDown,
  Building2,
  GraduationCap,
  Award,
  Fingerprint,
  CheckCircle2,
  Target,
  Rocket,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext.tsx";
import { useLanguage } from "../context/LanguageContext.tsx";

function AnimatedCounter({
  to,
  suffix = "",
}: {
  to: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const steps = 60;
    const step = Math.max(1, Math.floor(to / steps));
    const interval = duration / steps;

    const id = window.setInterval(() => {
      start += step;
      if (start >= to) {
        setVal(to);
        window.clearInterval(id);
      } else {
        setVal(start);
      }
    }, interval);

    return () => window.clearInterval(id);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString() + suffix}</span>;
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(16,185,129,0.45)] border border-emerald-200/70">
      {n}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accent = "indigo",
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: "indigo" | "emerald" | "sky" | "violet" | "amber" | "rose";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const accents = {
    indigo:
      "bg-indigo-50 text-indigo-500 border-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.25)]",
    emerald:
      "bg-emerald-50 text-emerald-500 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]",
    sky: "bg-sky-50 text-sky-500 border-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.25)]",
    violet:
      "bg-violet-50 text-violet-500 border-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.25)]",
    amber:
      "bg-amber-50 text-amber-500 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
    rose: "bg-rose-50 text-rose-500 border-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)]",
  };

  return (
    <motion.div
      ref={ref}
      style={{ transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, y: 50, rotateX: 24, scale: 0.92 }}
      animate={
        inView
          ? { opacity: 1, y: 0, rotateX: 0, scale: 1 }
          : undefined
      }
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -12,
        rotateX: 6,
        rotateY: -6,
        scale: 1.03,
        boxShadow: "0 30px 60px rgba(0,0,0,0.12), 0 0 40px rgba(99,102,241,0.18)",
      }}
      className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-8 flex flex-col gap-5 group transition-all duration-300 z-10"
    >
      <div
        className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${accents[accent]} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900 mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

function TestimonialCard({
  name,
  role,
  company,
  text,
  delay = 0,
}: {
  name: string;
  role: string;
  company: string;
  text: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      style={{ transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, z: 40, rotateY: 14, scale: 0.95 }}
      animate={inView ? { opacity: 1, z: 0, rotateY: 0, scale: 1 } : undefined}
      transition={{ duration: 0.75, delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.03, rotateY: 4, rotateX: 4 }}
      className="bg-gradient-to-b from-white to-slate-50 border border-slate-100/80 rounded-3xl p-8 flex flex-col gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)]"
    >
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed font-medium">
        {text}
      </p>
      <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-200/50">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(99,102,241,0.5)] border-2 border-white">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-900">{name}</p>
          <p className="text-xs text-indigo-500 font-bold">
            {role} · {company}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function JobPill({
  title,
  company,
  tag,
  top,
  left,
  delay,
  scrollYProgress,
}: {
  title: string;
  company: string;
  tag: string;
  top: string;
  left: string;
  delay: number;
  scrollYProgress: any;
}) {
  const drift = useTransform(scrollYProgress, [0, 1], [0, Math.random() * -140 - 40]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotate: Math.random() * 18 - 9 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay, duration: 0.8, type: "spring", bounce: 0.35 }}
      style={{ top, left, y: drift }}
      whileHover={{
        scale: 1.08,
        zIndex: 50,
        boxShadow: "0 20px 40px rgba(99,102,241,0.28)",
      }}
      className="absolute bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-left hidden lg:block cursor-pointer z-10"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100/80 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
          <Briefcase size={16} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800 leading-tight">
            {title}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">{company}</p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded-full ml-3">
          {tag}
        </span>
      </div>
    </motion.div>
  );
}

export function Home() {
  const t = useLanguage();
  const setPageContext = useAccessibility();
  const heroRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // useEffect(() => {
    // setPageContext?.({
    //   page: "Home",
    //   description: "VEGA career platform landing page.",
    //   suggestions: ["Open Jobs", "Login", "Register"],
    // });
  //   return () => setPageContext?.(null);
  // }, [setPageContext]);

  const { scrollYProgress: containerScroll } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "start end"],
  });

  const heroY = useTransform(heroScroll, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0]);
  const heroRotateX = useTransform(heroScroll, [0, 1], [0, 22]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.82]);

  const tabs = [
    { label: "For Students", icon: GraduationCap },
    { label: "For Professionals", icon: Briefcase },
    { label: "For Companies", icon: Building2 },
  ];

  const tabContent = [
    {
      heading: "Land your dream job faster than ever.",
      desc: "Build a powerful profile, get AI coaching, and connect with companies in Solapur and beyond.",
      cta: "Get Started Free",
      link: "/register",
      points: [
        "AI-powered resume builder",
        "Mock interview simulations",
        "Campus placement tracker",
      ],
    },
    {
      heading: "Unlock your next big opportunity.",
      desc: "Whether you are switching roles or climbing the ladder, VEGA gives you the tools, network, and clarity to move forward.",
      cta: "Explore Opportunities",
      link: "/jobs",
      points: [
        "Smart job recommendations",
        "Skill gap analysis",
        "1-click applications",
      ],
    },
    {
      heading: "Find exceptional talent, effortlessly.",
      desc: "Post jobs, receive AI-screened candidates, and build your team with confidence.",
      cta: "Post a Job",
      link: "/companyregister",
      points: [
        "AI candidate screening",
        "Bulk applicant management",
        "Verified skill profiles",
      ],
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative bg-[#fafbff] selection:bg-indigo-200 selection:text-indigo-900 font-sans overflow-hidden"
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-300/30 via-purple-300/10 to-transparent blur-[100px] rounded-full mix-blend-multiply opacity-70 animate-pulse" />
        <div className="absolute top-20 left-[-10%] w-[500px] h-[500px] bg-emerald-300/20 blur-[120px] rounded-full mix-blend-multiply animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-40 right-[-10%] w-[600px] h-[600px] bg-sky-300/20 blur-[120px] rounded-full mix-blend-multiply animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.12)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <section
        ref={heroRef}
        style={{ perspective: "1200px" }}
        className="relative min-h-[100svh] flex flex-col justify-center items-center px-4 pt-24 pb-16"
      >
        <JobPill title="Frontend Engineer" company="TechCorp India" tag="Remote" top="20%" left="5%" delay={1.1} scrollYProgress={heroScroll} />
        <JobPill title="Data Analyst" company="FinEdge Ltd." tag="Hybrid" top="65%" left="8%" delay={1.35} scrollYProgress={heroScroll} />
        <JobPill title="Product Manager" company="StartupX" tag="Full-time" top="28%" left="72%" delay={1.2} scrollYProgress={heroScroll} />
        <JobPill title="UX Designer" company="DesignHub" tag="New" top="60%" left="78%" delay={1.45} scrollYProgress={heroScroll} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, rotateX: heroRotateX, scale: heroScale, transformStyle: "preserve-3d" }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-full mb-8 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
              AI-Powered Career Platform · Solapur
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, z: -100, rotateX: 20 }}
            animate={{ opacity: 1, z: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.1, type: "spring", stiffness: 80 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6 drop-shadow-xl"
            style={{ fontFamily: "Sora, DM Sans, sans-serif" }}
          >
            Your Career,
            <br />
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
                Supercharged
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 origin-left rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"
              />
            </span>
            <br />
            by Intelligence.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-semibold"
          >
            VEGA connects students and professionals in Solapur with verified companies, AI mentorship, and the tools to grow in one highly interactive ecosystem.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-16"
          >
            <Link
              to="/register"
              className="relative group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-[0_15px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.6)] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.6s_infinite]" />
              <span className="relative z-10 flex items-center gap-2">
                Get Started — It’s Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              to="/jobs"
              className="group flex items-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md text-indigo-700 border border-indigo-100 rounded-2xl font-bold text-sm hover:border-indigo-300 hover:bg-white transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.2)] hover:scale-105 hover:-translate-y-1"
            >
              <Globe2 size={18} className="text-indigo-500 group-hover:rotate-180 transition-transform duration-700" />
              Browse Open Roles
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 font-extrabold"
          >
            {[
              { icon: Users, text: "12,000 Students" },
              { icon: Building2, text: "450 Companies" },
              { icon: Award, text: "98% Placement Rate" },
            ].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm rounded-lg border border-white/60 shadow-sm"
              >
                <item.icon size={16} className="text-indigo-400" />
                {item.text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-indigo-400 z-20"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-black">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          >
            <ChevronDown size={24} />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative bg-white/80 backdrop-blur-xl border-y border-white/50 py-8 overflow-hidden z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-emerald-500/5 to-purple-500/5" />
        <div className="flex gap-16 items-center whitespace-nowrap animate-[marquee_30s_linear_infinite] relative z-10 w-max">
          {[
            { val: 12000, label: "Students Placed", color: "text-indigo-600" },
            { val: 450, label: "Partner Companies", color: "text-emerald-600" },
            { val: 98, label: "Satisfaction Rate", color: "text-amber-500", suffix: "%" },
            { val: 14, label: "Avg. Time to Hire", color: "text-sky-600", suffix: " Days" },
            { val: 3200, label: "Jobs Listed", color: "text-purple-600" },
            { val: 99, label: "Verified Profiles", color: "text-rose-500", suffix: "%" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4 shrink-0 hover:scale-110 transition-transform duration-300">
              <span className={`text-3xl font-black ${s.color}`}>
                <AnimatedCounter to={s.val} suffix={s.suffix ?? ""} />
              </span>
              <span className="text-sm text-slate-600 font-bold uppercase tracking-widest">
                {s.label}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-8" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <p className="text-sm font-black uppercase tracking-[0.4em] text-indigo-500 mb-3">
              Tailored For You
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              One platform,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                every path.
              </span>
            </h2>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              return (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`relative flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 ${
                    activeTab === i
                      ? "bg-indigo-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.5)] scale-105 -translate-y-1"
                      : "bg-white/60 text-slate-500 hover:bg-white hover:text-indigo-600 border border-white/40 backdrop-blur-md"
                  }`}
                >
                  {activeTab === i && (
                    <motion.div
                      layoutId="active-tab-glow"
                      className="absolute inset-0 rounded-xl bg-indigo-400 blur-md -z-10 opacity-60"
                    />
                  )}
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, rotateX: 25, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, rotateX: -25, y: -40, scale: 0.97 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
              style={{ transformStyle: "preserve-3d" }}
              className="grid md:grid-cols-2 gap-16 items-center bg-white/40 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
            >
              <div>
                <h3 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-6">
                  {tabContent[activeTab].heading}
                </h3>
                <p className="text-slate-600 text-lg font-medium leading-relaxed mb-8">
                  {tabContent[activeTab].desc}
                </p>
                <ul className="space-y-4 mb-10">
                  {tabContent[activeTab].points.map((point, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.2 }}
                      className="flex items-center gap-4 text-base font-bold text-slate-800 bg-white/50 px-4 py-2 rounded-lg border border-white/60 shadow-sm"
                    >
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      {point}
                    </motion.li>
                  ))}
                </ul>
                <Link
                  to={tabContent[activeTab].link}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 hover:scale-105"
                >
                  {tabContent[activeTab].cta}
                  <ArrowRight size={18} />
                </Link>
              </div>

              <motion.div
                whileHover={{ rotateY: -8, rotateX: 5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 100 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-md rounded-3xl p-8 border border-white shadow-[0_20px_40px_rgba(99,102,241,0.1)]"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] text-white"
                >
                  <Zap size={18} />
                </motion.div>

                <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_30px_rgba(0,0,0,0.1)] mb-6 border border-white/50">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner">
                      <BrainCircuit size={22} className="text-indigo-600" />
                    </div>
                    <div className="h-3 w-32 bg-slate-200 rounded-full" />
                    <span className="ml-auto text-xs font-black text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg">
                      Live Match
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="h-2.5 bg-slate-100 rounded-full w-full" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-4/5" />
                    <div className="h-2.5 bg-indigo-200 rounded-full w-3/5 shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Profile Score", val: 94, color: "text-emerald-600 bg-emerald-100/80 border-emerald-200" },
                    { label: "Jobs Matched", val: 38, color: "text-indigo-600 bg-indigo-100/80 border-indigo-200" },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl p-5 border backdrop-blur-md ${m.color} hover:scale-105 transition-transform`}
                    >
                      <p className="text-3xl font-black mb-1">{m.val}</p>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest">
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-sm font-black uppercase tracking-[0.4em] text-emerald-500 mb-3">
              Simple by Design
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              From signup to hired
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                in 4 clear steps.
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, icon: Fingerprint, title: "Create Profile", desc: "Our AI builds a powerful, verified profile from your resume in minutes.", color: "indigo" },
              { step: 2, icon: BrainCircuit, title: "AI Coaching", desc: "Identify skill gaps, practice interviews, and get a tailored roadmap.", color: "sky" },
              { step: 3, icon: Target, title: "Smart Matches", desc: "The engine surfaces roles perfectly aligned to your unique skills.", color: "violet" },
              { step: 4, icon: Rocket, title: "Get Hired", desc: "One-click apply to verified openings and track your journey live.", color: "emerald" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, z: -100, rotateY: -30, scale: 0.8 }}
                  whileInView={{ opacity: 1, z: 0, rotateY: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.8, delay: i * 0.15, type: "spring" }}
                  whileHover={{ y: -15, scale: 1.04, rotateX: 8 }}
                  className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] group"
                >
                  <div className="absolute top-12 right-[-24px] z-20 hidden md:block opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                    <ArrowRight size={24} className="text-indigo-400" />
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white ${
                    s.color === "indigo" ? "bg-indigo-100 text-indigo-600" :
                    s.color === "sky" ? "bg-sky-100 text-sky-600" :
                    s.color === "violet" ? "bg-violet-100 text-violet-600" :
                    "bg-emerald-100 text-emerald-600"
                  }`}>
                    <Icon size={26} />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <StepBadge n={s.step} />
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-32 px-4 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent -z-10" />
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-black uppercase tracking-[0.4em] text-purple-500 mb-3">
                Platform Capabilities
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Everything you need
                <br />
                <span className="text-slate-300">to win the job market.</span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Link
                to="/features"
                className="group flex items-center gap-2 text-base font-black text-indigo-600 hover:gap-4 transition-all bg-white/50 px-6 py-3 rounded-xl border border-white/60 shadow-sm hover:shadow-[0_10px_20px_rgba(99,102,241,0.2)] hover:-translate-y-1 backdrop-blur-sm"
              >
                See all features
                <ArrowRight size={18} className="group-hover:text-purple-500 transition-colors" />
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard delay={0} accent="indigo" icon={<BrainCircuit size={24} />} title="AI Resume Builder" desc="Upload your resume and watch our AI rewrite it for ATS optimization and recruiter impact in seconds." />
            <FeatureCard delay={0.1} accent="emerald" icon={<MessageSquare size={24} />} title="Mock Interviews" desc="Face adaptive AI interviewers, get scored on tone, confidence, and accuracy, then improve." />
            <FeatureCard delay={0.2} accent="sky" icon={<BarChart3 size={24} />} title="Skill Gap Analysis" desc="See exactly what skills you are missing for your dream role and get a personalized learning path." />
            <FeatureCard delay={0.3} accent="violet" icon={<ShieldCheck size={24} />} title="Verified Profiles" desc="Trustworthy skill verification that companies can rely on, with fewer fake credentials." />
            <FeatureCard delay={0.4} accent="amber" icon={<Globe2 size={24} />} title="450 Companies" desc="Direct pipelines to Solapur’s fastest-growing companies plus national MNC partners." />
            <FeatureCard delay={0.5} accent="rose" icon={<TrendingUp size={24} />} title="Career Analytics" desc="Track applications, interview stages, and salary benchmarks with a beautiful live dashboard." />
          </div>
        </div>
      </section>

      <section className="py-32 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-sm font-black uppercase tracking-[0.4em] text-amber-500 mb-3">
              Real Stories
            </p>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">
              Careers changed.
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
                Lives moved.
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              delay={0}
              name="Priya Kulkarni"
              role="Software Engineer"
              company="TCS Pune"
              text="VEGA's AI mock interviews prepared me better than any coaching class. I got placed in 2 weeks after my profile went live."
            />
            <TestimonialCard
              delay={0.15}
              name="Rohit Mane"
              role="Data Analyst"
              company="FinEdge Mumbai"
              text="The skill gap analysis was eye-opening. I learned the tools I was missing, updated my profile, and had 4 interview calls within a week."
            />
            <TestimonialCard
              delay={0.3}
              name="Sneha Patil"
              role="Product Designer"
              company="DesignHub Bengaluru"
              text="I never thought a Solapur-based platform could compete with LinkedIn. VEGA proved me completely wrong."
            />
          </div>
        </div>
      </section>

      <section className="py-32 px-4 relative overflow-hidden z-10 mt-10 rounded-t-[3rem]">
        <div className="absolute inset-0 bg-[#0B0F19] -z-20" />
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden mix-blend-screen">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/30 blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/30 blur-[100px]"
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            style={{ transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, rotateX: -20, scale: 0.8, z: -200 }}
            whileInView={{ opacity: 1, rotateX: 0, scale: 1, z: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, type: "spring", stiffness: 60 }}
          >
            <motion.div
              whileHover={{ rotate: 180, scale: 1.15 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-400/50 items-center justify-center mb-10 shadow-[0_0_30px_rgba(99,102,241,0.5)] backdrop-blur-md"
            >
              <Sparkles size={36} className="text-indigo-300" />
            </motion.div>

            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8">
              Ready to take control
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                of your career?
              </span>
            </h2>

            <p className="text-indigo-100/70 text-xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
              Join over 12,000 students and professionals in Solapur who are building careers they are proud of starting today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/register"
                className="group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base transition-all duration-300 hover:scale-110 hover:-translate-y-2 shadow-[0_20px_40px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_rgba(167,139,250,0.6)] overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  Create Your Free Account <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>

              <Link
                to="/companyregister"
                className="flex items-center gap-3 px-10 py-5 bg-white/5 backdrop-blur-md text-slate-300 border border-white/20 rounded-2xl font-bold text-base hover:bg-white/10 hover:text-white hover:border-white/40 hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                <Building2 size={20} />
                I’m a Company
              </Link>
            </div>

            <p className="text-slate-500 text-sm mt-10 font-bold uppercase tracking-widest">
              No credit card required · Free forever plan available · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}