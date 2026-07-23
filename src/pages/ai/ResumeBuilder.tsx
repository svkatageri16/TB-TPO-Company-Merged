import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { useAccessibility } from "../../context/AccessibilityContext.tsx";
import { motion, AnimatePresence } from "motion/react";
import { ConsentModal } from "../../components/ConsentModal.tsx";
import { 
  FileText, Sparkles, Download, 
  Layout, CheckCircle2, AlertTriangle, 
  CheckCircle, User, Briefcase, GraduationCap, Code,
  Mail, Phone, MapPin, Brain, RefreshCw, Trophy, Zap, Edit3, Cpu,
  Trash2, Plus, Save, Coins, AlertCircle
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- TEMPLATES ---

const CustomSections = ({ data, headingClass, bodyClass }: { data: any, headingClass?: string, bodyClass?: string }) => {
  if (!data?.custom_sections_json || data.custom_sections_json.length === 0) return null;
  return (
    <>
      {(Array.isArray(data?.custom_sections_json) ? data.custom_sections_json : []).map((section: any, idx: number) => {
        if (!section || !section.title) return null;
        return (
          <section key={section.id || idx} className="mt-5 mb-5 last:mb-0">
            <h3 className={headingClass || "text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2"}>
              {section.title}
            </h3>
            <div className={bodyClass || "text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-1.5"}>
              {section.content}
            </div>
          </section>
        );
      })}
    </>
  );
};

const HybridATSPremiumTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-serif leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="text-center pb-4 mb-6 border-b border-slate-300">
      <h1 className="text-3xl font-bold uppercase tracking-tight mb-2 text-slate-900">{data.full_name}</h1>
      <div className="text-xs space-x-2 text-slate-700 font-mono">
        <span>{data.email}</span>
        <span>•</span>
        <span>{data.contact}</span>
        <span>•</span>
        <span>{data.address}</span>
      </div>
      <div className="text-xs flex justify-center gap-4 mt-2 font-mono text-indigo-800">
         {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="underline" target="_blank" rel="noreferrer">LinkedIn</a>}
         {data.social_links_json?.github && <a href={data.social_links_json.github} className="underline" target="_blank" rel="noreferrer">GitHub</a>}
      </div>
    </div>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Professional Summary</h3>
      <p className="text-xs leading-relaxed text-slate-800">{summary}</p>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Technical Skills</h3>
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div>
          <span className="font-bold">Primary Skills: </span>
          {data.skills_json?.join(", ")}
        </div>
        <div>
          <span className="font-bold">Frameworks & Methodologies: </span>
          React, Node.js, Express, REST APIs, UI Design, Unit Testing
        </div>
        <div>
          <span className="font-bold">Databases & Tools: </span>
          MySQL, PostgreSQL, MongoDB, Git, Docker, Cloud Platforms
        </div>
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Professional Experience</h3>
      <div className="space-y-4 font-serif">
        {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{exp.company} — {exp.role}</span>
              <span>{exp.duration}</span>
            </div>
            <p className="text-slate-700 leading-relaxed mt-1">{exp.desc}</p>
            <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-805 space-y-0.5">
              <li>Utilized software engineering workflows to deliver performant full-stack modules.</li>
              <li>Collaborated within multi-disciplinary agile squads to optimize product execution SLAs by 15%.</li>
            </ul>
          </div>
        ))}
        {(!data.experience_json || data.experience_json.length === 0 || data.experience_type === 'FRESHER') && (
          <div className="text-xs text-slate-500 italic">
            Upcoming engineering specialist with strong project-driven research background. Practiced in modern continuous integration pipelines and automated testing schedules.
          </div>
        )}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Academic History</h3>
      <div className="space-y-3 font-serif">
        {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-bold text-slate-900">
              <span>{edu.level === 'Degree' ? edu.board : edu.school}</span>
              <span>{edu.year}</span>
            </div>
            <p>{edu.level === 'Degree' ? 'Bachelor of Technology' : edu.level} • Score Cumulative: {edu.percentage || edu.cgpa || edu.grade}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-2">Technical Projects</h3>
      <div className="space-y-4 font-serif">
        {(Array.isArray(data?.projects_json) ? data.projects_json : []).map((p: any, i: number) => (
          <div key={i} className="text-xs">
             <div className="flex justify-between font-bold text-slate-900 mb-1">
                <span className="uppercase">{p.name}</span>
                <span className="font-mono text-[10px] text-indigo-700">{p.tech_stack}</span>
             </div>
             <p className="text-slate-700 leading-relaxed">{p.description}</p>
             <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-805 space-y-0.5">
                <li>Architected full features using industry standards with comprehensive type checks.</li>
                <li>Pioneered responsive client-side layout adjustments ensuring cross-platform browser compatibility.</li>
             </ul>
          </div>
        ))}
      </div>
    </section>

    <CustomSections data={data} headingClass="text-sm font-bold uppercase tracking-widest text-slate-800 border-b-2 border-slate-900 pb-1 mb-3 mt-6" bodyClass="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-1.5" />
  </div>
);

const SiliconValleyTechTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-sans leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{data.full_name}</h1>
        <p className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest mt-1">Software Engineer Specialist</p>
      </div>
      <div className="text-right text-xs font-semibold text-slate-605 space-y-1">
         <p>{data.email}</p>
         <p>{data.contact}</p>
         <p>{data.address?.split(',').slice(-2).join(', ') || 'Remote / Eligible'}</p>
         <div className="flex justify-end gap-3 text-indigo-600 font-bold mt-1">
            {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="hover:underline" target="_blank" rel="noreferrer">linkedin</a>}
            {data.social_links_json?.linkedin && data.social_links_json?.github && <span>•</span>}
            {data.social_links_json?.github && <a href={data.social_links_json.github} className="hover:underline" target="_blank" rel="noreferrer">github</a>}
         </div>
      </div>
    </div>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">01 / Summary</h3>
      <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">02 / Technical Skills</h3>
      <div className="flex flex-wrap gap-2">
         {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
            <span key={s} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-[10px] font-bold border border-slate-200/50">
               {s}
            </span>
         ))}
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">System Architecture</span>
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">CI/CD Pipelines</span>
         <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-[10px] font-bold border border-indigo-100/50">Git Workflows</span>
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">03 / Key Projects</h3>
      <div className="space-y-4">
         {(Array.isArray(data?.projects_json) ? data.projects_json : []).map((p: any, i: number) => (
            <div key={i}>
               <div className="flex justify-between items-baseline">
                  <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{p.tech_stack}</span>
               </div>
               <p className="text-xs text-slate-605 mt-1 leading-relaxed">{p.description}</p>
               <div className="grid grid-cols-2 gap-x-4 text-[10px] text-slate-500 mt-1.5 font-medium">
                  <div className="flex items-center gap-1.5">⚡ Optimized performance and reduced page rendering cycles by 30%.</div>
                  <div className="flex items-center gap-1.5">🛠️ Maintained 95%+ code coverage using comprehensive modern unit tests.</div>
               </div>
            </div>
         ))}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">04 / Experience</h3>
      <div className="space-y-4">
         {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
            <div key={i}>
               <div className="flex justify-between items-baseline font-bold text-slate-900 text-xs">
                  <span>{exp.company} — {exp.role}</span>
                  <span className="font-mono text-slate-500 font-normal">{exp.duration}</span>
               </div>
               <p className="text-xs text-slate-600 leading-relaxed mt-1">{exp.desc}</p>
            </div>
         ))}
         {(!data.experience_json || data.experience_json.length === 0 || data.experience_type === 'FRESHER') && (
            <div className="text-xs text-slate-500 italic">
               fresher software architect. Completed intensive bootcamps focused on distributed systems, enterprise databases, and clean code principles. Ready to contribute code immediately.
            </div>
         )}
      </div>
    </section>

    <section className="mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5">05 / Education</h3>
      <div className="space-y-3">
         {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
            <div key={i} className="flex justify-between items-baseline text-xs">
               <div>
                  <span className="font-bold text-slate-900">{edu.level === 'Degree' ? 'Bachelor of Technology in CS / IT' : edu.level}</span>
                  <span className="text-slate-500 text-[11px]"> ({edu.board || edu.school})</span>
               </div>
               <div className="text-right font-mono">
                  <span className="font-bold text-slate-800">{edu.year}</span>
                  <span className="text-slate-400"> | CGPA {edu.percentage || edu.cgpa || edu.grade}</span>
               </div>
            </div>
         ))}
      </div>
    </section>

    <CustomSections data={data} headingClass="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b border-slate-200 pb-1 mb-2.5 mt-6" bodyClass="text-xs text-slate-705 leading-relaxed whitespace-pre-line mt-1.5" />
  </div>
);

const DYNAMIC_STYLE_CONFIGS: Record<string, any> = {
  "isabel-sales": {
    layout: "double-column",
    headerBg: "bg-slate-900 text-white rounded-xl py-3 px-4 mb-4",
    sectionTitleClass: "text-xs font-black bg-slate-800 text-white px-3 py-1 rounded uppercase tracking-wider mb-3",
    bulletStyle: "circle",
    accentColor: "slate-900"
  },
  "olivia-bba-marketing": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-blue-900 text-white p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-blue-900 tracking-wider border-b-2 border-blue-900/20 pb-1 mb-3",
    accentColor: "blue-900"
  },
  "olivia-marketing-projects": {
    layout: "clean-single-col",
    borderTop: "border-t-4 border-blue-600",
    sectionTitleClass: "text-xs font-black uppercase text-blue-900 tracking-wider pb-1 mb-3 border-b-2 border-blue-105",
    accentColor: "blue-600"
  },
  "aaron-stats-analyst": {
    layout: "clean-single-col",
    headerBg: "bg-sky-50 p-6 rounded-2xl border border-sky-101",
    sectionTitleClass: "text-xs font-bold text-sky-900 tracking-widest border-b-2 border-sky-200 pb-1 uppercase mb-3",
    accentColor: "sky-600"
  },
  "aaron-data-projects": {
    layout: "clean-single-col",
    borderLeft: "border-l-4 border-sky-500 pl-4",
    sectionTitleClass: "text-xs font-bold uppercase text-sky-800 tracking-widest pb-1 mb-4 border-b border-sky-100",
    accentColor: "sky-500"
  },
  "daniel-gallego-hr": {
    layout: "clean-single-col",
    fontFamily: "font-sans",
    borderTop: "border-t-4 border-amber-600",
    sectionTitleClass: "text-xs font-black uppercase tracking-widest text-amber-800 border-b border-amber-100 pb-1 mb-3",
    accentColor: "amber-600"
  },
  "daniel-hr-achievements": {
    layout: "double-column",
    sectionTitleClass: "text-xs font-black uppercase text-amber-900 border-b border-amber-205 pb-1 mb-3",
    accentColor: "amber-700"
  },
  "drew-business-consultant": {
    layout: "clean-single-col",
    headerBg: "bg-slate-50 border-b-2 border-slate-900 p-8",
    sectionTitleClass: "text-xs font-black uppercase text-slate-950 tracking-widest border-b border-slate-300 pb-1 mb-3",
    accentColor: "slate-900"
  },
  "drew-consultant-projects": {
    layout: "double-column",
    sectionTitleClass: "text-xs font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-1 mb-3",
    accentColor: "slate-800"
  },
  "noah-sales-expert": {
    layout: "clean-single-col",
    headerBg: "bg-amber-50/50 border-l-4 border-amber-500 p-6 rounded-r-xl",
    sectionTitleClass: "text-xs font-bold uppercase tracking-wider text-amber-700 border-b border-amber-200/50 pb-1 mb-3",
    accentColor: "amber-500"
  },
  "noah-sales-achievements": {
    layout: "clean-single-col",
    sectionTitleClass: "text-xs font-extrabold uppercase text-amber-900 border-b-2 border-amber-400 pb-1 mb-3",
    accentColor: "amber-600"
  },
  "dani-ux-designer": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-stone-900 text-stone-100 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black tracking-wider text-stone-900 border-b border-stone-200 pb-1 mb-3 uppercase",
    accentColor: "stone-900"
  },
  "korina-ux-designer": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-slate-100 text-slate-800 p-6 border-r border-slate-200",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black text-slate-900 border-b-2 border-indigo-600 pb-1 mb-3 uppercase",
    accentColor: "indigo-600"
  },
  "samira-it-security": {
    layout: "clean-single-col",
    borderTop: "border-t-8 border-indigo-500",
    headerBg: "bg-gradient-to-r from-indigo-50 to-indigo-100/30 p-6 rounded-b-2xl",
    sectionTitleClass: "text-xs font-extrabold text-indigo-900 border-b border-indigo-200 pb-1 uppercase tracking-wider mb-3",
    accentColor: "indigo-600"
  },
  "rufus-stewart-yellow": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-yellow-500 text-slate-950 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-slate-950 tracking-wider bg-yellow-105 px-3 py-1 rounded mb-3",
    accentColor: "yellow-500"
  },
  "rufus-stewart-cyan": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-cyan-500 text-slate-950 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-slate-950 tracking-wider bg-cyan-105 px-3 py-1 rounded mb-3",
    accentColor: "cyan-500"
  },
  "rufus-stewart-navy": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-indigo-950 text-white p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-indigo-100 tracking-wider bg-indigo-900/40 px-3 py-1 rounded mb-3",
    accentColor: "indigo-950"
  },
  "rufus-stewart-slate": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-slate-700 text-white p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-slate-900 tracking-wider bg-slate-100 px-3 py-1 rounded mb-3",
    accentColor: "slate-700"
  },
  "samira-hadid-border": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-stone-50 text-stone-800 p-6 border-r border-stone-100",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold text-stone-900 tracking-wide border-b border-stone-200 pb-1 uppercase mb-3",
    accentColor: "stone-700"
  },
  "olivia-wilson-manager": {
    layout: "split-sidebar-right",
    sidebarBg: "bg-slate-50 text-slate-800 p-6 border-l border-slate-100",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-extrabold text-slate-900 border-b border-slate-200 pb-1 uppercase mb-3",
    accentColor: "slate-800"
  },
  "olivia-sanchez": {
    layout: "clean-single-col",
    borderTop: "border-t-4 border-indigo-700",
    sectionTitleClass: "text-xs font-black bg-indigo-50 text-indigo-900 py-1.5 px-3 rounded uppercase mb-3",
    accentColor: "indigo-700"
  },
  "richard-sanchez-gray": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-zinc-850 text-zinc-100 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold uppercase tracking-wider text-zinc-900 border-b-2 border-zinc-200 pb-1 mb-3",
    accentColor: "zinc-800"
  },
  "olivia-wilson-orange": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-zinc-900 text-zinc-101 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black text-amber-500 border-b-2 border-amber-500 pb-1 uppercase tracking-widest mb-3",
    accentColor: "amber-500"
  },
  "samira-hadid-gm": {
    layout: "top-banner",
    bannerBg: "bg-teal-950 text-white p-8",
    sectionTitleClass: "text-xs font-black tracking-widest text-teal-950 border-b-2 border-teal-800/30 pb-1 uppercase mb-3",
    accentColor: "teal-950"
  },
  "hannah-morales-nurse": {
    layout: "clean-single-col",
    borderTop: "border-t-4 border-rose-500",
    sectionTitleClass: "text-xs font-extrabold text-rose-700 border-b border-rose-100 pb-1 uppercase mb-3",
    accentColor: "rose-500"
  },
  "hannah-morales-details": {
    layout: "double-column",
    sectionTitleClass: "text-xs font-black uppercase text-rose-900 border-b border-rose-200 pb-1 mb-3",
    accentColor: "rose-800"
  },
  "rachel-akinwale": {
    layout: "clean-single-col",
    background: "bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100",
    sectionTitleClass: "text-xs font-black bg-white rounded-xl shadow-sm border border-blue-50 px-4 py-2 uppercase text-blue-900 mb-3",
    accentColor: "blue-800"
  },
  "helene-paquet": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-orange-50 text-orange-950 p-6 border-r border-orange-100",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold text-orange-900 border-b-2 border-orange-400 pb-1 uppercase tracking-wider mb-3",
    accentColor: "orange-500"
  },
  "brigitte-schwartz": {
    layout: "top-banner",
    bannerBg: "bg-cyan-50 border-b-2 border-cyan-100 p-8 text-cyan-950",
    sectionTitleClass: "text-xs font-bold text-cyan-900 uppercase tracking-widest border-b border-cyan-200 pb-1 mb-3",
    accentColor: "cyan-600"
  },
  "estelle-darcy": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-stone-100 text-stone-950 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold text-stone-900 uppercase tracking-widest mb-3 border-b-2 border-stone-300 pb-1",
    accentColor: "stone-800"
  },
  "richard-sanchez-gold": {
    layout: "top-banner",
    bannerBg: "bg-amber-950 text-amber-50 p-8",
    sectionTitleClass: "text-xs font-black text-amber-900 border-b border-amber-200 pb-1 mb-3 uppercase tracking-wider",
    accentColor: "amber-800"
  },
  "richard-sanchez-teal": {
    layout: "top-banner",
    bannerBg: "bg-teal-900 text-teal-50 p-8",
    sectionTitleClass: "text-xs font-black text-teal-800 border-b border-teal-200 pb-1 mb-3 uppercase tracking-wider",
    accentColor: "teal-700"
  },
  "donna-stroupe": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-zinc-800 text-zinc-100 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-extrabold uppercase text-indigo-600 tracking-wider mb-3 border-b-2 border-indigo-200 pb-1",
    accentColor: "indigo-600"
  },
  "lorna-villanueva": {
    layout: "top-banner",
    bannerBg: "bg-blue-600 text-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-blue-900 border-b border-blue-200 pb-1 mb-3",
    accentColor: "blue-600"
  },
  "dani-martinez-marketing": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-slate-800 text-slate-100 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-3 uppercase",
    accentColor: "slate-800"
  },
  "devi-chaudhry": {
    layout: "clean-single-col",
    background: "bg-stone-50 border-8 border-double border-amber-800 p-8",
    sectionTitleClass: "text-xs font-serif font-black tracking-widest text-amber-800 border-b border-amber-850 pb-1 uppercase mb-3",
    accentColor: "amber-800"
  },
  "anna-katrina-preschool": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-rose-50 text-slate-800 p-6 border-r border-rose-100",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-extrabold text-rose-800 uppercase tracking-widest mb-3 bg-rose-100 text-rose-900 rounded-lg px-2.5 py-1",
    accentColor: "rose-600"
  },
  "samira-hadid-navy": {
    layout: "top-banner",
    bannerBg: "bg-indigo-950 text-white p-8",
    sectionTitleClass: "text-xs font-black uppercase tracking-widest text-indigo-950 border-b-2 border-amber-400 pb-1 mb-3",
    accentColor: "indigo-950"
  },
  "sacha-dubois": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-slate-900 text-white p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black text-slate-900 border-b-2 border-slate-900 pb-1 mb-3 uppercase",
    accentColor: "slate-900"
  },
  "estela-dominguez": {
    layout: "split-sidebar-right",
    sidebarBg: "bg-emerald-50 text-emerald-950 p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-black uppercase text-emerald-900 border-b border-emerald-200 pb-1 mb-3",
    accentColor: "emerald-800"
  },
  "ricardo-soto": {
    layout: "split-sidebar-left",
    sidebarBg: "bg-indigo-600 text-white p-6",
    mainBg: "bg-white p-8",
    sectionTitleClass: "text-xs font-bold text-indigo-900 border-b border-indigo-200 pb-1 mb-3 uppercase",
    accentColor: "indigo-600"
  },
  "maanvita-kumari-designer": {
    layout: "clean-single-col",
    borderLeft: "border-l-4 border-slate-900 pl-4",
    sectionTitleClass: "text-xs font-extrabold text-slate-950 border-b border-slate-200 pb-1 mb-3 uppercase",
    accentColor: "slate-900"
  },
  "isabel-schumacher-sales": {
    layout: "double-column",
    sectionTitleClass: "text-xs font-black text-slate-800 border-b-2 border-slate-300 pb-1 mb-3 uppercase",
    accentColor: "slate-800"
  },
  "greta-manager": {
    layout: "clean-single-col",
    headerBg: "bg-stone-50 p-8 border-b-4 border-stone-800",
    sectionTitleClass: "text-xs font-black text-stone-900 uppercase tracking-widest mb-3 border-b border-stone-300 pb-1",
    accentColor: "stone-800"
  },
  "olivia-wilson-thai": {
    layout: "clean-single-col",
    background: "bg-gradient-to-tr from-sky-50 via-pink-50 to-teal-50 p-8 rounded-3xl",
    sectionTitleClass: "text-xs font-extrabold text-sky-950 border-b-2 border-sky-300 pb-1 mb-3 uppercase",
    accentColor: "sky-600"
  },
  "adora-montini": {
    layout: "clean-single-col",
    background: "bg-[#faf8f5] p-8 border border-stone-200 rounded-3xl shadow-sm",
    sectionTitleClass: "text-xs font-serif font-black tracking-widest text-[#8a7258] border-b border-[#8a7258]/35 pb-1 uppercase mb-3",
    accentColor: "stone-700"
  },
  "kumberry-ngian": {
    layout: "clean-single-col",
    background: "bg-[#fffaf0] p-8 border-2 border-orange-200 rounded-2xl",
    sectionTitleClass: "text-xs font-black text-orange-600 tracking-wider uppercase border-b-2 border-orange-100 pb-1 mb-3",
    accentColor: "orange-600"
  },
  "creative-pastel-frame": {
    layout: "double-column",
    background: "bg-gradient-to-br from-pink-50 to-cyan-50 p-8 rounded-3xl border border-pink-100",
    sectionTitleClass: "text-xs font-black text-pink-700 uppercase bg-white/70 px-3 py-1 rounded inline-block mb-3",
    accentColor: "pink-600"
  }
};

const DynamicTemplate = ({ id, data, summary, photo }: any) => {
  const config = DYNAMIC_STYLE_CONFIGS[id] || {
    layout: "clean-single-col",
    sectionTitleClass: "text-xs font-black uppercase tracking-wider text-slate-800 border-b-2 border-slate-200 pb-1 mb-3",
    accentColor: "slate-800"
  };

  const renderContactInfo = () => (
    <div className="text-[10px] space-y-1 text-slate-500 font-medium font-mono">
      <p className="flex items-center gap-1">📞 {data.contact}</p>
      <p className="flex items-center gap-1">✉️ {data.email}</p>
      <p className="flex items-center gap-1">📍 {data.address || "123 Anywhere St., Any City"}</p>
      {data.social_links_json?.linkedin && <p className="flex items-center gap-1">🔗 {data.social_links_json.linkedin}</p>}
      {data.social_links_json?.github && <p className="flex items-center gap-1">💻 {data.social_links_json.github}</p>}
    </div>
  );

  const renderSummary = () => (
    <section className="mb-5 last:mb-0">
      <h3 className={config.sectionTitleClass}>About Me / Profile</h3>
      <p className="text-xs text-slate-600 leading-relaxed italic pr-2">{summary || data.bio}</p>
    </section>
  );

  const renderSkills = () => (
    <section className="mb-5 last:mb-0">
      <h3 className={config.sectionTitleClass}>Skills & Expertise</h3>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((skill: any, i: number) => {
          const name = typeof skill === 'string' ? skill : (skill.name || skill);
          return (
            <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-800 text-[10px] font-bold rounded border border-slate-150 uppercase tracking-tight">
              {name}
            </span>
          );
        })}
      </div>
    </section>
  );

  const renderProjects = () => (
    <section className="mb-5 last:mb-0">
      <h3 className={config.sectionTitleClass}>Key Projects</h3>
      <div className="space-y-3">
        {(Array.isArray(data?.projects_json) ? data.projects_json : []).map((p: any, i: number) => (
          <div key={i} className="group">
            <div className="flex justify-between items-baseline font-bold text-slate-900 text-xs">
              <h4 className="uppercase tracking-tight">{p.name || p.title}</h4>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.2 rounded font-bold uppercase">{p.tech_stack || p.stack}</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{p.description || p.desc}</p>
          </div>
        ))}
        {(!data.projects_json || data.projects_json.length === 0) && (
          <p className="text-[11px] text-slate-400 italic">Project records updated dynamically via editor panel.</p>
        )}
      </div>
    </section>
  );

  const renderExperience = () => (
    <section className="mb-5 last:mb-0">
      <h3 className={config.sectionTitleClass}>Work Experience</h3>
      <div className="space-y-3">
        {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between items-baseline font-bold text-slate-900 text-xs">
              <span className="uppercase tracking-tight">{exp.role} @ {exp.company}</span>
              <span className="font-mono text-[10px] text-slate-500 font-medium">{exp.duration}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed mt-1">{exp.desc || exp.description}</p>
          </div>
        ))}
        {(!data.experience_json || data.experience_json.length === 0 || data.experience_type === 'FRESHER') && (
          <div className="text-[11px] text-slate-500 italic leading-relaxed">
            Fresher ready to execute core development duties. Highly skilled in frontend framework patterns, API state matching, and unit test compilation.
          </div>
        )}
      </div>
    </section>
  );

  const renderEducation = () => (
    <section className="mb-5 last:mb-0">
      <h3 className={config.sectionTitleClass}>Education & Training</h3>
      <div className="space-y-2">
        {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="flex justify-between items-baseline text-xs">
            <div>
              <span className="font-extrabold text-slate-900 uppercase tracking-tight text-[11px]">{edu.level === 'Degree' ? 'Bachelor of Technology' : edu.level}</span>
              <span className="text-slate-500 text-[10px] font-medium font-mono"> ({edu.board || edu.school})</span>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-700 font-bold">
              <span>{edu.year}</span>
              <span className="text-slate-400 font-normal"> | CGPA {edu.percentage || edu.cgpa || edu.grade || "8.5"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div 
      id="resume-content" 
      className={`bg-white p-12 text-slate-800 leading-relaxed w-[210mm] min-h-[297mm] mx-auto shadow-sm relative overflow-hidden font-sans border border-slate-100 ${config.background || ""}`}
    >
      {id.includes("orange") && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-20 rounded-bl-full pointer-events-none" />
      )}
      {id.includes("cyan") && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500 opacity-20 rounded-bl-full pointer-events-none" />
      )}

      {config.layout === "split-sidebar-left" && (
        <div className="flex h-full gap-8">
          <div className={`w-[200px] shrink-0 rounded-2xl flex flex-col justify-between ${config.sidebarBg || "bg-slate-50"} p-5 min-h-[265mm]`}>
            <div className="space-y-6">
              <div className="space-y-4">
                {photo ? (
                  <img src={photo} crossOrigin="anonymous" className="w-28 h-28 rounded-full border-4 border-white shadow-md object-cover mx-auto" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 mx-auto text-xl uppercase">{data.full_name?.substring(0, 2)}</div>
                )}
                <div className="text-center">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase leading-tight">{data.full_name}</h1>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">{data.experience_type || "PROFESSIONAL"}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">My Contact</h4>
                {renderContactInfo()}
              </div>

              <div className="border-t border-slate-200 pt-4">
                {renderSkills()}
              </div>
            </div>
            
            <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-3">
              Standard layout verified • Page 1 of 1
            </div>
          </div>

          <div className="flex-1 space-y-5">
            {renderSummary()}
            {renderExperience()}
            {renderProjects()}
            {renderEducation()}
            <CustomSections data={data} headingClass={config.sectionTitleClass} bodyClass="text-xs text-slate-705 leading-relaxed whitespace-pre-line mt-1.5" />
          </div>
        </div>
      )}

      {config.layout === "split-sidebar-right" && (
        <div className="flex h-full gap-8">
          <div className="flex-1 space-y-5">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">{data.full_name}</h1>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1.5">{data.experience_type || "EXECUTIVE"}</p>
              </div>
              {photo && (
                <img src={photo} crossOrigin="anonymous" className="w-20 h-20 rounded shadow-md object-cover" />
              )}
            </div>
            {renderSummary()}
            {renderExperience()}
            {renderProjects()}
            {renderEducation()}
            <CustomSections data={data} headingClass={config.sectionTitleClass} bodyClass="text-xs text-slate-705 leading-relaxed whitespace-pre-line mt-1.5" />
          </div>

          <div className={`w-[200px] shrink-0 rounded-2xl flex flex-col justify-between ${config.sidebarBg || "bg-slate-50"} p-5 min-h-[265mm]`}>
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">My Contact</h4>
                {renderContactInfo()}
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                {renderSkills()}
              </div>
            </div>
          </div>
        </div>
      )}

      {config.layout === "double-column" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-5 border-b-2 border-slate-300">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950">{data.full_name}</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{data.experience_type || "EXECUTIVE"}</p>
            </div>
            <div className="flex items-center gap-4">
              {renderContactInfo()}
              {photo && <img src={photo} crossOrigin="anonymous" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              {renderSummary()}
              {renderSkills()}
              {renderEducation()}
            </div>
            <div className="space-y-5">
              {renderExperience()}
              {renderProjects()}
              <CustomSections data={data} headingClass={config.sectionTitleClass} bodyClass="text-xs text-slate-750 leading-relaxed whitespace-pre-line mt-1.5" />
            </div>
          </div>
        </div>
      )}

      {config.layout === "top-banner" && (
        <div className="space-y-6">
          <div className={`rounded-2xl ${config.bannerBg || "bg-slate-900 text-white"} p-6 flex justify-between items-center relative overflow-hidden shadow-sm`}>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase leading-none">{data.full_name}</h1>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1.5">{data.experience_type || "PROFESSIONAL"}</p>
              <div className="flex gap-4 mt-3 opacity-90 text-[10px] font-mono">
                <span>📞 {data.contact}</span>
                <span>✉️ {data.email}</span>
                <span>📍 {data.address || "123 Anywhere, Any City"}</span>
              </div>
            </div>
            {photo && (
              <img src={photo} crossOrigin="anonymous" className="w-16 h-16 rounded-xl border-2 border-white/40 shadow-md object-cover relative z-10" />
            )}
          </div>

          {renderSummary()}
          
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
              {renderExperience()}
              {renderProjects()}
              <CustomSections data={data} headingClass={config.sectionTitleClass} bodyClass="text-xs text-slate-705 leading-relaxed whitespace-pre-line mt-1.5" />
            </div>
            <div className="space-y-5">
              {renderSkills()}
              {renderEducation()}
            </div>
          </div>
        </div>
      )}

      {config.layout === "clean-single-col" && (
        <div className="space-y-5">
          <div className={`pb-5 border-b border-slate-100 flex justify-between items-start ${config.headerBg || ""}`}>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{data.full_name}</h1>
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">{data.experience_type || "ENGINEER"}</p>
            </div>
            <div className="flex items-center gap-4">
              {renderContactInfo()}
              {photo && <img src={photo} crossOrigin="anonymous" className="w-16 h-16 rounded-xl border shadow-sm object-cover" />}
            </div>
          </div>

          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          
          <div className="grid grid-cols-2 gap-6">
            {renderSkills()}
            {renderEducation()}
          </div>
          <CustomSections data={data} headingClass={config.sectionTitleClass} bodyClass="text-xs text-slate-705 leading-relaxed whitespace-pre-line mt-1.5" />
        </div>
      )}
    </div>
  );
};

const ClassicATSTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-white p-12 text-slate-900 font-serif leading-relaxed w-[210mm] min-h-[297mm] mx-auto shadow-sm">
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
      <div className="flex-1">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{data.full_name}</h1>
        <div className="text-xs space-y-1 text-slate-600">
          <p>{data.email} • {data.contact}</p>
          <p>{data.address}</p>
          <div className="flex gap-3">
             {data.social_links_json?.linkedin && <span>LinkedIn: {data.social_links_json.linkedin}</span>}
             {data.social_links_json?.github && <span>GitHub: {data.social_links_json.github}</span>}
          </div>
        </div>
      </div>
      {photo && (
        <img src={photo} crossOrigin="anonymous" className="w-24 h-24 rounded shadow-sm grayscale ml-6 object-cover" />
      )}
    </div>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Professional Summary</h3>
      <p className="text-xs leading-relaxed italic">{summary}</p>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Core Expertise</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
          <span key={s} className="font-bold">• {s}</span>
        ))}
      </div>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Work Experience</h3>
      <div className="space-y-4">
        {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-black uppercase">
              <span>{exp.company}</span>
              <span>{exp.duration}</span>
            </div>
            <p className="font-bold text-slate-600 italic mb-1">{exp.role}</p>
            <p className="text-slate-500">{exp.desc}</p>
          </div>
        ))}
        {data.experience_type === 'FRESHER' && <p className="text-xs text-slate-400 italic">No formal work experience (Fresher status)</p>}
      </div>
    </section>

    <section className="mb-8">
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Education</h3>
      <div className="space-y-3">
        {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="text-xs">
            <div className="flex justify-between font-black">
              <span>{edu.level === 'Degree' ? edu.board : edu.school}</span>
              <span>{edu.year}</span>
            </div>
            <p>{edu.level === 'Degree' ? 'Bachelor Degree' : edu.level} • {edu.percentage || edu.cgpa || edu.grade}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 mb-3">Key Projects</h3>
      <div className="space-y-4">
        {(Array.isArray(data?.projects_json) ? data.projects_json : []).map((p: any, i: number) => (
          <div key={i} className="text-xs">
             <p className="font-black uppercase mb-1">{p.name}</p>
             <p className="text-slate-600">{p.description}</p>
             <div className="flex gap-2 mt-1">
                {p.tech_stack?.split(',').map((t: string) => (
                  <span key={t} className="text-[10px] font-bold text-slate-400">#{t.trim()}</span>
                ))}
             </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const AcademicLatexTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-[10mm] text-[#000000] font-serif w-[210mm] min-h-[297mm] mx-auto shadow-sm leading-[1.2]">
    {/* Header */}
    <div className="text-center mb-4">
      <h1 className="text-[24pt] font-bold uppercase mb-1">{data.full_name}</h1>
      <div className="text-[10pt] flex items-center justify-center gap-2 flex-wrap">
        <span>{data.contact}</span>
        <span>•</span>
        <a href={`mailto:${data.email}`} className="text-blue-700 underline">{data.email}</a>
        <span>•</span>
        <span>{data.address?.split(',').pop()?.trim() || 'Location'}</span>
      </div>
      <div className="text-[10pt] flex items-center justify-center gap-2 mt-1">
        {data.social_links_json?.github && <a href={data.social_links_json.github} className="text-blue-700 underline">github.com/{data.social_links_json.github.split('/').pop()}</a>}
        {data.social_links_json?.github && data.social_links_json?.linkedin && <span>•</span>}
        {data.social_links_json?.linkedin && <a href={data.social_links_json.linkedin} className="text-blue-700 underline">linkedin.com/in/{data.social_links_json.linkedin.split('/').pop()}</a>}
      </div>
    </div>

    {/* Professional Summary */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Professional Summary</h2>
      <p className="text-[10.9pt] text-justify leading-[1.3]">{summary || data.bio}</p>
    </section>

    {/* Education */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Education</h2>
      <div className="space-y-1">
        {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
          <div key={i} className="flex justify-between items-baseline">
            <div>
              <span className="font-bold">{edu.level === 'Degree' ? 'B.Tech - Computer Science and Engineering' : edu.level}</span>
              <br />
              <span className="italic">{edu.level === 'Degree' ? edu.board : edu.school}</span>
            </div>
            <div className="text-right">
              <span className="font-bold">{edu.year - 4} -- {edu.year}</span>
              <br />
              <span className="italic">CGPA: {edu.cgpa || edu.percentage || edu.grade} / 10.0</span>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Skills */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Technical Skills</h2>
      <ul className="list-disc pl-5 text-[10.9pt] space-y-0.5">
        <li><span className="font-bold">Languages:</span> {(Array.isArray(data?.skills_json) ? data.skills_json : []).slice(0, 5).join(', ')}</li>
        <li><span className="font-bold">Frameworks & Libraries:</span> React, Node.js, Express, Tailwind CSS</li>
        <li><span className="font-bold">Databases:</span> MySQL, PostgreSQL, MongoDB</li>
        <li><span className="font-bold">Tools & Cloud:</span> Git, Docker, AWS, Vercel</li>
      </ul>
    </section>

    {/* Projects */}
    <section className="mb-4">
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Projects</h2>
      <div className="space-y-3">
        {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between font-bold text-[10.9pt]">
              <span>{p.name}</span>
              <span className="italic font-normal">Django, MySQL, REST API</span>
            </div>
            <ul className="list-disc pl-5 text-[10.9pt] mt-1">
              <li>{p.description}</li>
            </ul>
          </div>
        ))}
      </div>
    </section>

    {/* Achievements */}
    <section>
      <h2 className="text-[14pt] font-bold border-b border-black mb-1 w-full pb-0.5">Achievements & Activities</h2>
      <ul className="list-disc pl-5 text-[10.9pt] space-y-0.5">
        <li>Maintaining Top 5% academic ranking in department with CGPA of {data.education_json?.[0]?.cgpa || '9.64'}.</li>
        <li>Active contributor to open-source projects on GitHub.</li>
        <li>Participated in various state-level innovation competitions.</li>
      </ul>
    </section>
  </div>
);

const ExecutiveGridTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-[#FFFFFF] w-[210mm] min-h-[297mm] mx-auto shadow-sm font-sans text-[#1A1A1A]">
    <div className="grid grid-cols-12 min-h-[297mm]">
      {/* Left Column (Main) */}
      <div className="col-span-8 p-12 space-y-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-6">{data.full_name}</h1>
          <p className="mt-4 text-sm text-slate-500 font-medium leading-relaxed">{summary}</p>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-1.5 h-6 bg-indigo-600" />
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Professional Experience</h3>
          </div>
          <div className="space-y-8">
            {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
              <div key={i} className="group">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-800">{exp.company}</h4>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{exp.duration}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{exp.role}</p>
                <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">{exp.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-1.5 h-6 bg-indigo-600" />
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Key Projects</h3>
          </div>
          <div className="grid grid-cols-2 gap-6">
             {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 4).map((p: any, i: number) => (
               <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase mb-2">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4 line-clamp-3">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.tech_stack?.split(',').map((t: string) => (
                      <span key={t} className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">#{t.trim()}</span>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        </section>
      </div>

      {/* Right Column (Info) */}
      <div className="col-span-4 bg-slate-900 p-10 text-white space-y-10">
        {photo && (
          <img src={photo} crossOrigin="anonymous" className="w-full aspect-square rounded-[32px] object-cover mb-8 border-2 border-slate-800" />
        )}

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Information</h3>
          <div className="space-y-4">
             <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase">Email</p>
                <p className="text-[11px] font-medium truncate">{data.email}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase">Contact</p>
                <p className="text-[11px] font-medium">{data.contact}</p>
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Competencies</h3>
          <div className="space-y-6">
             {(Array.isArray(data?.skills_json) ? data.skills_json : []).slice(0, 8).map((s: string) => (
                <div key={s} className="space-y-2">
                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      <span>{s}</span>
                      <span>Expert</span>
                   </div>
                   <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-[90%]" />
                   </div>
                </div>
             ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 underline decoration-indigo-600 underline-offset-8">Education</h3>
          <div className="space-y-6">
             {(Array.isArray(data?.education_json) ? data.education_json : []).map((edu: any, i: number) => (
                <div key={i}>
                   <p className="text-xs font-black text-white uppercase">{edu.level}</p>
                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{edu.board || edu.school}</p>
                   <p className="text-[10px] text-indigo-400 font-black mt-1">{edu.year}</p>
                </div>
             ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

const MinimalSwissTemplate = ({ data, summary }: any) => (
  <div id="resume-content" className="bg-white p-16 text-[#000000] font-sans w-[210mm] min-h-[297mm] mx-auto shadow-sm tracking-tight">
    <header className="mb-20">
      <h1 className="text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8">{data.full_name?.split(' ')[0]}<br />{data.full_name?.split(' ')[1] || ''}</h1>
      <div className="grid grid-cols-4 gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
         <div>
            <p className="mb-2">Contact</p>
            <p className="text-black">{data.contact}</p>
         </div>
         <div>
            <p className="mb-2">Network</p>
            <p className="text-black">{data.email}</p>
         </div>
         <div className="col-span-2">
            <p className="mb-2">Objective</p>
            <p className="text-black normal-case leading-relaxed font-medium tracking-normal text-sm">{summary}</p>
         </div>
      </div>
    </header>

    <div className="grid grid-cols-4 gap-12">
       <div className="col-span-1 space-y-12">
          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">Expertise</h3>
             <div className="space-y-2 text-sm font-bold uppercase text-slate-400">
                {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                   <p key={s} className="text-black">{s}</p>
                ))}
             </div>
          </section>

          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6">Learning</h3>
             <div className="space-y-6">
                {(Array.isArray(data?.education_json) ? data.education_json : []).map((edu: any, i: number) => (
                   <div key={i}>
                      <p className="text-[10px] font-black text-slate-300 mb-1">{edu.year}</p>
                      <p className="text-xs font-bold uppercase">{edu.level}</p>
                   </div>
                ))}
             </div>
          </section>
       </div>

       <div className="col-span-3 space-y-16">
          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b-4 border-black pb-4">Selected Projects</h3>
             <div className="space-y-12">
                {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                   <div key={i} className="grid grid-cols-3 gap-6">
                      <div className="text-xs font-black uppercase leading-tight">{p.name}</div>
                      <div className="col-span-2 text-sm font-medium text-slate-600 leading-relaxed tracking-normal">{p.description}</div>
                   </div>
                ))}
             </div>
          </section>

          <section>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 border-b-4 border-black pb-4">Background</h3>
             <div className="space-y-12">
                {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                   <div key={i} className="grid grid-cols-3 gap-6">
                      <div className="text-xs font-black uppercase leading-tight">{exp.company} <br /><span className="text-slate-300">{exp.duration}</span></div>
                      <div className="col-span-2 text-sm font-medium text-slate-600 leading-relaxed tracking-normal">
                         <p className="font-bold text-black mb-2 uppercase text-[10px] tracking-widest">{exp.role}</p>
                         {exp.desc}
                      </div>
                   </div>
                ))}
             </div>
          </section>
       </div>
    </div>
  </div>
);

const TechnicalEliteTemplate = ({ data, summary, photo }: any) => (
   <div id="resume-content" className="bg-[#FAFAFA] w-[210mm] min-h-[297mm] mx-auto shadow-sm font-mono text-[#2D3436] p-10">
      <div className="bg-white border-2 border-slate-900 rounded-[40px] overflow-hidden flex flex-col min-h-[calc(297mm-80px)]">
         <header className="bg-slate-900 text-emerald-400 p-10 flex justify-between items-center">
            <div>
               <h2 className="text-xs font-black tracking-[0.5em] uppercase mb-4 opacity-70">Resident Specialist</h2>
               <h1 className="text-4xl font-black tracking-tight uppercase">{data.full_name}</h1>
               <div className="mt-6 flex gap-6 text-[10px] font-bold">
                  <span>/ {data.email}</span>
                  <span>/ {data.contact}</span>
               </div>
            </div>
            {photo && <img src={photo} crossOrigin="anonymous" className="w-24 h-24 rounded-2xl border-2 border-emerald-400 grayscale contrast-125 hover:grayscale-0 transition-all cursor-crosshair object-cover" />}
         </header>

         <div className="flex-1 flex">
            {/* Sidebar */}
            <aside className="w-1/3 border-r-2 border-slate-900 p-10 space-y-12">
               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Stack.config</h4>
                  <div className="space-y-4">
                     {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                        <div key={s} className="flex flex-col gap-1">
                           <span className="text-[10px] uppercase font-bold">{s}</span>
                           <div className="flex gap-1">
                              {[1,2,3,4,5].map(v => (
                                 <div key={v} className={`w-3 h-3 rounded-sm ${v <= 4 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-slate-100'}`} />
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
               </section>

               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Info.sys</h4>
                  <div className="space-y-4 text-[11px] font-bold">
                     <div>
                        <p className="text-slate-400 uppercase text-[9px] mb-1">Status</p>
                        <p className="uppercase">Available for Hire</p>
                     </div>
                     <div>
                        <p className="text-slate-400 uppercase text-[9px] mb-1">Education</p>
                        <ul className="space-y-2">
                           {(Array.isArray(data?.education_json) ? data.education_json : []).slice(0, 2).map((edu: any, i: number) => (
                              <li key={i} className="uppercase leading-tight">{edu.board || edu.school} <br /><span className="text-emerald-500">[{edu.year}]</span></li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </section>
            </aside>

            {/* Main */}
            <main className="flex-1 p-10 space-y-12">
               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 px-4 py-1 bg-slate-100 rounded inline-block">Profile.log</h4>
                  <p className="text-xs font-bold leading-relaxed text-slate-500 italic">
                     {summary}
                  </p>
               </section>

               <section>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 px-4 py-1 bg-slate-100 rounded inline-block">Deployments.active</h4>
                  <div className="space-y-8">
                     {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                        <div key={i} className="relative pl-6 border-l-2 border-emerald-400">
                           <h5 className="text-[11px] font-black uppercase mb-2">{p.name}</h5>
                           <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-3">{p.description}</p>
                           <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded uppercase">{p.tech_stack}</div>
                        </div>
                     ))}
                  </div>
               </section>
            </main>
         </div>

         <footer className="bg-slate-50 p-6 flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-t-2 border-slate-900">
            <span>Verified VEGA Artifact</span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span>Ref: {data.user_id}-ELITE</span>
         </footer>
      </div>
   </div>
);


const ModernProTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-white flex w-[210mm] min-h-[297mm] mx-auto shadow-sm overflow-hidden font-sans">
    {/* Left Sidebar */}
    <div className="w-1/3 bg-slate-900 text-white p-8 space-y-10">
      <div className="text-center">
        {photo && (
          <img src={photo} crossOrigin="anonymous" className="w-32 h-32 rounded-3xl border-4 border-slate-800 mx-auto mb-4 object-cover" />
        )}
        <h2 className="text-lg font-black uppercase tracking-tight">{data.full_name}</h2>
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Aspiring Professional</p>
      </div>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Contact</h3>
        <div className="space-y-3 text-[10px]">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <Mail size={12} className="text-blue-400" />
             </div>
             <span className="truncate">{data.email}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <Phone size={12} className="text-blue-400" />
             </div>
             <span>{data.contact}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center shrink-0">
                <MapPin size={12} className="text-blue-400" />
             </div>
             <span>{data.address}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
            <span key={s} className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold">{s}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Certificates</h3>
        <div className="space-y-3">
           <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 text-[9px]">
              <p className="font-bold text-blue-300">VEGA AI Certified</p>
              <p className="text-slate-500 mt-1">Verification Code: TB-{data.user_id}</p>
           </div>
        </div>
      </section>
    </div>

    {/* Right Content */}
    <div className="flex-1 p-12 space-y-10">
      <section>
        <div className="flex items-center gap-3 mb-4">
           <Sparkles size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Professional Summary</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 font-medium italic">
          "{summary}"
        </p>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
           <GraduationCap size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Education</h3>
        </div>
        <div className="space-y-6">
          {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
            <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-blue-600 before:rounded-full">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-[11px] font-black uppercase">{edu.level === 'Degree' ? edu.board : edu.school}</h4>
                <span className="text-[9px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded">{edu.year}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{edu.level} • Score: {edu.percentage || edu.cgpa || edu.grade}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
           <Code size={16} className="text-blue-600" />
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Projects & Experience</h3>
        </div>
        <div className="space-y-6">
          {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <h4 className="text-[11px] font-black uppercase mb-2 text-blue-600">{p.name}</h4>
               <p className="text-[10px] text-slate-600 leading-relaxed mb-3">{p.description}</p>
               <div className="flex flex-wrap gap-2">
                 {p.tech_stack?.split(',').map((t: string) => (
                   <span key={t} className="text-[8px] font-black bg-white px-2 py-0.5 rounded border border-slate-200 uppercase text-slate-400">{t.trim()}</span>
                 ))}
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const CreativeMinTemplate = ({ data, summary, photo }: any) => (
  <div id="resume-content" className="bg-slate-50 p-12 w-[210mm] min-h-[297mm] mx-auto shadow-sm font-sans flex flex-col gap-8">
     {/* Header Card */}
     <div className="bg-white rounded-[40px] p-10 flex items-center justify-between shadow-sm border border-slate-100">
        <div>
           <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">{data.full_name?.split(' ')[0]}<br /><span className="text-indigo-600">{data.full_name?.split(' ')[1] || ''}</span></h1>
           <div className="flex items-center gap-4 mt-6">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.email}</p>
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data.contact}</p>
           </div>
        </div>
        {photo && (
          <div className="relative group">
             <div className="absolute inset-0 bg-indigo-600 rounded-[35px] rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-xl shadow-indigo-200" />
             <img src={photo} crossOrigin="anonymous" className="relative w-36 h-36 rounded-[35px] object-cover border-4 border-white grayscale hover:grayscale-0 transition-all duration-500" />
          </div>
        )}
     </div>

     {/* Summary Card */}
     <div className="bg-indigo-600 text-white rounded-[40px] p-10 shadow-xl shadow-indigo-200">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-4">Professional Insight</h3>
        <p className="text-xl font-medium leading-relaxed tracking-tight italic">
          "{summary}"
        </p>
     </div>

     {/* Bottom Grid */}
     <div className="grid grid-cols-2 gap-8 flex-1">
        <div className="space-y-8">
           <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Layout size={16} className="text-indigo-600" /> Key Projects
              </h3>
              <div className="space-y-6">
                 {(Array.isArray(data?.projects_json) ? data.projects_json : []).map((p: any, i: number) => (
                   <div key={i}>
                      <p className="text-xs font-black text-slate-800 mb-2">{p.name}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{p.description}</p>
                   </div>
                 ))}
              </div>
           </section>

           <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Code size={16} className="text-indigo-600" /> Expert Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                 {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                   <span key={s} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">
                      {s}
                   </span>
                 ))}
              </div>
           </section>
        </div>

        <div className="space-y-8">
            <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <GraduationCap size={16} className="text-indigo-600" /> Background
              </h3>
              <div className="space-y-6">
                  {(Array.isArray(data?.education_json) ? [...data.education_json] : []).sort((a: any, b: any) => (b.year || 0) - (a.year || 0)).map((edu: any, i: number) => (
                    <div key={i} className="flex gap-4">
                       <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                          {edu.year % 100}
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-800">{edu.level === 'Degree' ? 'Bachelors Degree' : edu.level}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">{edu.level === 'Degree' ? edu.board : edu.school}</p>
                       </div>
                    </div>
                  ))}
              </div>
            </section>

            <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex-1 flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center mb-4">
                  <Briefcase size={24} className="text-indigo-200" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect</p>
               <p className="text-xs font-bold text-slate-800 mt-1">{data.email}</p>
               <p className="text-[9px] text-indigo-600 font-bold mt-4 uppercase tracking-tighter">TB ID: #{data.user_id}</p>
            </section>
        </div>
     </div>
  </div>
);

const MarketerGoldTimelineTemplate = ({ data, summary, photo }: any) => {
  const languages = data?.languages_json || ["English (Fluent)", "Spanish (Conversational)", "Hindi (Native)"];
  const references = data?.references_json || [
    { name: "Estelle Darcy", title: "Wardiere Inc. / CEO", company: "Wardiere Inc.", contact: "+123-456-7890" },
    { name: "Harper Russo", title: "Wardiere Inc. / CEO", company: "Wardiere Inc.", contact: "+123-456-7890" }
  ];
  return (
    <div id="resume-content" className="bg-[#fbfcfa] p-12 text-slate-800 font-sans leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm relative overflow-hidden text-left">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.04] rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Header Band */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-slate-900 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} crossOrigin="anonymous" className="w-20 h-20 rounded-full border-4 border-amber-400 rotate-[-3deg] hover:rotate-0 transition-transform duration-300 shadow-md object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-3xl shadow-md">
              {data?.full_name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tight leading-none">{data?.full_name || "Applicant Name"}</h1>
            <p className="text-xs font-black text-amber-500 uppercase tracking-widest mt-2">{data?.headline || "Product & Marketing Specialist"}</p>
          </div>
        </div>
        <div className="text-xs space-y-1 text-slate-600 font-medium font-mono text-left sm:text-right w-full sm:w-auto">
          <p className="flex items-center sm:justify-end gap-1"><span className="text-amber-500">■</span> {data?.email}</p>
          <p className="flex items-center sm:justify-end gap-1"><span className="text-amber-500">■</span> {data?.contact}</p>
          <p className="flex items-center sm:justify-end gap-1"><span className="text-amber-500">■</span> {data?.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Hand: Contact & Ratings */}
        <div className="col-span-12 md:col-span-5 space-y-8 border-r border-slate-100 pr-4">
          <section className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> About Me
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-600 font-medium">{summary}</p>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Academic Profile
            </h3>
            <div className="space-y-4">
              {(Array.isArray(data?.education_json) ? data.education_json : []).map((edu: any, i: number) => (
                <div key={i} className="text-[11px] font-sans font-medium">
                  <span className="text-amber-500 font-bold block">{edu.year} • GPA {edu.percentage || edu.cgpa || edu.grade}</span>
                  <p className="font-bold text-slate-950">{edu.level === 'Degree' ? 'Bachelors Degree in CSE' : edu.level}</p>
                  <p className="text-slate-500 text-[10px] leading-tight mt-0.5">{edu.board || edu.school}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Languages
            </h3>
            <div className="space-y-2 text-[10px] uppercase font-bold text-slate-600">
              {languages.map((lang: string, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <span>{lang}</span>
                  <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: i === 0 ? "100%" : i === 1 ? "75%" : "50%" }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> References
            </h3>
            <div className="space-y-3">
              {references.map((ref: any, i: number) => (
                <div key={i} className="text-[10px] text-slate-500 border-l border-amber-300 pl-3">
                  <p className="font-extrabold text-slate-800">{ref.name}</p>
                  <p className="font-semibold text-slate-500 text-[9px]">{ref.title} @ {ref.company}</p>
                  <p className="font-medium text-slate-400 font-mono text-[9px]">{ref.contact}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Hand: Experience & Project Timeline */}
        <div className="col-span-12 md:col-span-7 space-y-8">
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Core Competencies
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {(Array.isArray(data?.skills_json) ? data.skills_json : []).slice(0, 8).map((s: string, idx: number) => (
                <div key={idx} className="space-y-1 font-sans">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    <span>{s}</span>
                    <span className="text-amber-500">Expert</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <div 
                        key={dot} 
                        className={`w-2.5 h-2.5 rounded-full ${dot <= (5 - (idx % 2)) ? 'bg-amber-400 shadow-sm' : 'bg-slate-100'}`} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Work Timeline
            </h3>
            <div className="relative border-l border-slate-200 ml-2 pl-6 space-y-6">
              {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[29px] top-1.5 w-4 h-4 bg-white border-2 border-amber-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  </span>
                  <div className="flex justify-between items-start mb-1 text-[11px]">
                    <div>
                      <h4 className="font-bold text-slate-800 uppercase">{exp.company}</h4>
                      <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest">{exp.role}</p>
                    </div>
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-xl uppercase shrink-0">{exp.duration}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans">{exp.desc}</p>
                </div>
              ))}
              {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
                <div className="relative text-[11px] text-slate-500 italic pl-1">
                  <span className="absolute -left-[29px] top-1.5 w-4 h-4 bg-white border-2 border-amber-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  </span>
                  No formal corporate records listed. Ready for placement deployment.
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Strategic Projects
            </h3>
            <div className="space-y-4">
              {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="p-4 bg-slate-105 rounded-2xl border border-slate-150 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex justify-between items-baseline mb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{p.name}</h4>
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 p-1 rounded font-mono uppercase">{p.tech_stack}</span>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-normal">{p.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const DesignerBlackSidebarTemplate = ({ data, summary, photo }: any) => {
  const references = data?.references_json || [
    { name: "Ar. Samira Hadid", title: "Founder", company: "Thynk Unlimited", contact: "+123-456-7890" }
  ];
  return (
    <div id="resume-content" className="bg-white flex w-[210mm] min-h-[297mm] mx-auto shadow-sm overflow-hidden font-sans text-left">
      {/* Black Left Sidebar */}
      <div className="w-1/3 bg-slate-900 text-white p-8 flex flex-col justify-between shrink-0">
        <div className="space-y-10">
          <div className="text-center">
            {photo ? (
              <img src={photo} crossOrigin="anonymous" className="w-24 h-24 rounded-full border-4 border-slate-800 mx-auto mb-4 object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center font-bold text-3xl mx-auto mb-4">
                {data?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <h2 className="text-base font-black uppercase tracking-tight text-white leading-tight">{data?.full_name || "Applicant Name"}</h2>
            <p className="text-[9px] text-amber-400 font-extrabold uppercase tracking-[0.25em] mt-2">{data?.headline || "Creative Specialist"}</p>
          </div>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-800 pb-2 mb-4">Contact Details</h3>
            <div className="space-y-3 text-[10px] text-slate-350 font-medium font-mono">
              <p className="truncate">✉ {data?.email}</p>
              <p>☎ {data?.contact}</p>
              <p className="leading-tight">⌖ {data?.address}</p>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-800 pb-2 mb-4">Education</h3>
            <div className="space-y-4">
              {(Array.isArray(data?.education_json) ? data.education_json : []).slice(0, 3).map((edu: any, i: number) => (
                <div key={i} className="text-[10px] text-slate-300 space-y-0.5">
                  <p className="font-extrabold text-white text-[11px]">{edu.level === 'Degree' ? 'Bachelors' : edu.level}</p>
                  <p className="font-bold text-slate-400 leading-tight">{edu.board || edu.school}</p>
                  <p className="font-mono text-amber-400 text-[9px] font-bold">{edu.year} (CGPA: {edu.cgpa || edu.percentage || edu.grade})</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-800 pb-2 mb-4">Expertise Set</h3>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/50 rounded font-mono text-[9px] font-bold">
                  {s}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-800 text-center text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">
          VEGA Design Catalog
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 p-10 flex flex-col justify-between">
        <div className="space-y-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none uppercase">{data?.full_name || "Applicant Name"}</h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Portfolio Executive Summary</p>
          </div>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">01 / Profile</h3>
            <p className="text-xs leading-relaxed text-slate-600 font-medium italic">
              "{summary}"
            </p>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">02 / Experience</h3>
            <div className="space-y-6">
              {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between items-baseline font-bold text-slate-950 mb-1">
                    <span className="uppercase">{exp.company} — {exp.role}</span>
                    <span className="font-mono text-slate-450 text-[10px]">{exp.duration}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans">{exp.desc}</p>
                </div>
              ))}
              {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
                <p className="text-xs text-slate-400 italic">Pre-vetted engineering and design practitioner with structured academy level project capabilities.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">03 / Projects</h3>
            <div className="space-y-6">
              {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between items-baseline font-bold text-slate-950 mb-1">
                    <span className="uppercase font-black text-slate-800">{p.name}</span>
                    <span className="font-mono text-indigo-600 text-[9px] bg-slate-100 px-2 py-0.5 rounded">{p.tech_stack}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed mt-1 font-sans">{p.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Professional References</h3>
          <div className="grid grid-cols-2 gap-4">
            {references.slice(0, 2).map((ref: any, i: number) => (
              <div key={i} className="text-[10px] text-slate-500 font-medium">
                <p className="font-extrabold text-slate-800 leading-none">{ref.name}</p>
                <p className="text-[9px] text-slate-450 uppercase font-bold mt-1">{ref.title} @ {ref.company}</p>
                <p className="font-mono text-[9px] mt-0.5">{ref.contact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MedicalCareProfessionalTemplate = ({ data, summary }: any) => {
  const certifications = data?.certifications_json || [
    "Registered Professional Certificate - VEGA Verification",
    "Basic Life Support (BLS) - Active Recruiter Certification"
  ];
  return (
    <div id="resume-content" className="bg-white p-12 text-slate-800 font-sans leading-normal w-[210mm] min-h-[297mm] mx-auto shadow-sm text-left">
      {/* Top Header Bar */}
      <div className="bg-sky-650 text-white bg-sky-600 rounded-3xl p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-white">{data?.full_name || "Applicant Name"}</h1>
          <p className="text-xs font-black text-sky-100 uppercase tracking-widest mt-2">{data?.headline || "Licensed Nursing & Care Specialist"}</p>
        </div>
        <div className="text-xs font-mono text-sky-50 text-left sm:text-right space-y-1 sm:border-l border-sky-400/50 sm:pl-6 shrink-0 w-full sm:w-auto">
          <p>✉ {data?.email}</p>
          <p>☎ {data?.contact}</p>
          <p>⌖ {data?.address}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0369a1] bg-[#f0f9ff] px-4 py-1.5 rounded-xl inline-block mb-3">Clinical Profile</h3>
          <p className="text-xs leading-relaxed text-slate-650 font-medium font-sans">
            {summary}
          </p>
        </section>

        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0369a1] bg-[#f0f9ff] px-4 py-1.5 rounded-xl inline-block mb-4">Competency Directory</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">Core Clinical Expertise</span>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(data?.skills_json) ? data.skills_json : []).slice(0, 5).map((s: string) => (
                  <span key={s} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">{s}</span>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">Patient Care Technologies</span>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Operating Syringe Pumps</span>
                <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Diagnostic Tools</span>
                <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Electronic Health Records</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0369a1] bg-[#f0f9ff] px-4 py-1.5 rounded-xl inline-block mb-4">Professional History</h3>
          <div className="space-y-4">
            {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
              <div key={i} className="text-xs border-l-2 border-sky-500 pl-4 py-0.5">
                <div className="flex justify-between font-bold text-slate-905 mb-1">
                  <span>{exp.company} — {exp.role}</span>
                  <span className="font-mono text-slate-450 font-normal shrink-0">{exp.duration}</span>
                </div>
                <p className="text-slate-650 leading-relaxed font-sans">{exp.desc}</p>
              </div>
            ))}
            {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
              <p className="text-xs text-slate-450 italic pl-1">Internship candidate with certified rotation hours across departments including oncology, general medicine, and emergency care.</p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0369a1] bg-[#f0f9ff] px-4 py-1.5 rounded-xl inline-block mb-4">Academic Qualifications</h3>
          <div className="space-y-3">
            {(Array.isArray(data?.education_json) ? data.education_json : []).map((edu: any, i: number) => (
              <div key={i} className="flex justify-between items-baseline text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900">{edu.level === 'Degree' ? 'Bachelor of Science / Professional Degree' : edu.level}</span>
                  <p className="text-slate-500 leading-tight text-[11px] font-sans font-medium mt-1">{edu.board || edu.school}</p>
                </div>
                <div className="text-right font-mono text-[11px] font-semibold shrink-0">
                  <span className="text-sky-600 block">{edu.year}</span>
                  <span className="text-slate-400">Score: {edu.cgpa || edu.percentage || edu.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0369a1] bg-[#f0f9ff] px-4 py-1.5 rounded-xl inline-block mb-3">Licensing & Certifications</h3>
          <ul className="list-disc pl-5 text-[11px] text-slate-600 font-medium space-y-1">
            {certifications.map((cert: string, idx: number) => (
              <li key={idx}>{cert}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

const TexturedSlateSerifTemplate = ({ data, summary }: any) => {
  return (
    <div id="resume-content" className="bg-slate-100 p-10 text-slate-900 font-serif leading-relaxed w-[210mm] min-h-[297mm] mx-auto shadow-sm flex flex-col gap-6 text-left">
      {/* Editorial Header */}
      <div className="bg-white rounded-3xl p-8 border border-slate-205/60 shadow-xs text-center">
        <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight leading-none mb-3">{data?.full_name || "Applicant Name"}</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 font-sans">{data?.headline || "Communications & Business Strategy"}</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] font-medium font-sans text-slate-500 mt-6 border-t border-slate-100 pt-4">
          <span>✉ {data?.email}</span>
          <span>☎ {data?.contact}</span>
          <span>⌖ {data?.address}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1">
        {/* Left column */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-205/60 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-405 font-sans mb-3">About Me</h3>
            <p className="text-[11px] leading-relaxed text-slate-600 font-sans">{summary}</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-205/60 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-405 font-sans mb-4">Skills</h3>
            <div className="flex flex-wrap gap-1.5 font-sans">
              {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                <span key={s} className="bg-slate-50 text-slate-705 text-[10px] font-bold border border-slate-100 rounded-lg px-2.5 py-1">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-205/60 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-405 font-sans mb-2">Education</h3>
            {(Array.isArray(data?.education_json) ? data.education_json : []).slice(0, 3).map((edu: any, i: number) => (
              <div key={i} className="text-[11px] font-serif border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400 tracking-wider font-mono text-[9px] block">{edu.year}</span>
                <p className="font-extrabold text-slate-800">{edu.level === 'Degree' ? 'Bachelors' : edu.level}</p>
                <p className="text-slate-500 leading-tight text-[10px] font-sans mt-0.5">{edu.board || edu.school}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-205/60 shadow-xs space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-405 font-sans border-b border-slate-100 pb-3">Experiences</h3>
            <div className="space-y-6">
              {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                <div key={i} className="text-[11px]">
                  <div className="flex justify-between items-baseline mb-2 text-slate-900 font-extrabold">
                    <span className="uppercase text-xs font-black">{exp.company} — {exp.role}</span>
                    <span className="font-mono text-slate-400 text-[9px] font-bold shrink-0">{exp.duration}</span>
                  </div>
                  <p className="text-slate-655 font-sans leading-relaxed">{exp.desc}</p>
                </div>
              ))}
              {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
                <p className="text-xs text-slate-400 italic">Self-guided student developer with high technical readiness capabilities.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-205/60 shadow-xs space-y-4 font-serif">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-405 font-sans border-b border-slate-100 pb-3">Selected Projects</h3>
            {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
              <div key={i} className="text-[11px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-slate-900 uppercase font-sans tracking-tight">{p.name}</span>
                  <span className="text-[9px] font-bold font-mono text-slate-450 uppercase tracking-tighter">#{p.tech_stack}</span>
                </div>
                <p className="text-slate-610 font-sans leading-normal">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreativePastelFrameTemplate = ({ data, summary, photo }: any) => {
  return (
    <div id="resume-content" className="bg-gradient-to-br from-pink-50 to-cyan-50 p-6 w-[210mm] min-h-[297mm] mx-auto shadow-sm flex flex-col gap-6 font-sans text-left">
      <div className="bg-white/85 backdrop-blur-md rounded-[32px] p-8 border border-white/60 shadow-lg flex-1 flex flex-col gap-6">
        {/* Top Split */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-150 pb-6">
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} crossOrigin="anonymous" className="w-16 h-16 rounded-2xl border-2 border-pink-200 shadow-sm object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-indigo-500 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {data?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{data?.full_name || "Applicant Name"}</h1>
              <p className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider mt-2">{data?.headline || "UI/UX & Product Design Specialist"}</p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 space-y-0.5 text-left sm:text-right shrink-0">
            <p>✉ {data?.email}</p>
            <p>☎ {data?.contact}</p>
            <p>⌖ {data?.address}</p>
          </div>
        </div>

        {/* Profile */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">01 / Profile</h3>
          <p className="text-xs font-semibold leading-relaxed text-slate-700 italic">
            "{summary}"
          </p>
        </section>

        {/* Two Equal Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          {/* Left Column */}
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-4">02 / Skills & Tools</h3>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                  <span key={s} className="px-3 py-1 bg-white border border-pink-100 text-slate-700 rounded-full text-[10px] font-extrabold shadow-sm">
                    {s}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-4">03 / Education</h3>
              <div className="space-y-4">
                {(Array.isArray(data?.education_json) ? data.education_json : []).slice(0, 3).map((edu: any, i: number) => (
                  <div key={i} className="text-xs bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-mono text-indigo-550 font-black">{edu.year}</p>
                    <h4 className="font-extrabold text-slate-800 mt-1 uppercase">{edu.level === 'Degree' ? 'Bachelors Degree' : edu.level}</h4>
                    <p className="text-slate-500 text-[10px] font-medium leading-tight mt-0.5">{edu.board || edu.school}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">GPA Score: {edu.cgpa || edu.percentage || edu.grade}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-4">04 / Experience</h3>
              <div className="space-y-4">
                {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                  <div key={i} className="text-xs bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm font-sans">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-extrabold text-slate-850 uppercase tracking-tight">{exp.company}</h4>
                      <span className="font-mono text-slate-405 text-[9px] shrink-0">{exp.duration}</span>
                    </div>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-wider mb-2">{exp.role}</p>
                    <p className="text-slate-600 leading-normal font-sans">{exp.desc}</p>
                  </div>
                ))}
                {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
                  <p className="text-xs text-slate-400 italic">No formal prior jobs recorded. Solid experience in hands-on design models.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-4">05 / Projects</h3>
              <div className="space-y-3">
                {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                  <div key={i} className="text-xs font-sans">
                    <h5 className="font-extrabold text-slate-800 uppercase leading-snug">{p.name}</h5>
                    <p className="text-slate-550 leading-relaxed text-[11px] mt-1 font-sans">{p.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const AsymmetricalWriterTemplate = ({ data, summary, photo }: any) => {
  return (
    <div id="resume-content" className="bg-white flex w-[210mm] min-h-[297mm] mx-auto shadow-sm overflow-hidden font-sans text-left">
      {/* Dark Navy Sidebar */}
      <div className="w-1/3 bg-[#1e272e] text-white p-8 space-y-8 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          <div className="text-center">
            {photo ? (
              <img src={photo} crossOrigin="anonymous" className="w-[110px] h-[110px] rounded-full border-4 border-slate-700/80 mx-auto object-cover" />
            ) : (
              <div className="w-[110px] h-[110px] rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-3xl mx-auto">
                {data?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <h2 className="text-lg font-black uppercase tracking-tight text-white mt-4 leading-none">{data?.full_name || "Applicant Name"}</h2>
            <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest mt-2">{data?.headline || "Content Specialist"}</p>
          </div>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-400 border-b border-slate-700 pb-1 mb-3">About Me</h3>
            <p className="text-[11px] leading-relaxed text-slate-350 font-medium">{summary}</p>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-400 border-b border-slate-700 pb-1 mb-3">Academics</h3>
            <div className="space-y-4">
              {(Array.isArray(data?.education_json) ? data.education_json : []).slice(0, 2).map((edu: any, i: number) => (
                <div key={i} className="text-[10px] text-slate-300">
                  <span className="font-bold text-white uppercase text-[11px] block">{edu.level === 'Degree' ? 'Bachelors' : edu.level}</span>
                  <span className="font-medium text-slate-400 leading-tight block mt-0.5">{edu.board || edu.school}</span>
                  <span className="font-mono text-cyan-400 text-[9px] font-bold block mt-1">{edu.year} | Grade: {edu.cgpa || edu.percentage || edu.grade}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-400 border-b border-slate-700 pb-1 mb-3">Core Skills</h3>
            <div className="flex flex-wrap gap-1 font-sans">
              {(Array.isArray(data?.skills_json) ? data.skills_json : []).map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-205 border border-slate-700 rounded font-mono text-[9px] font-bold">
                  {s}
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center border-t border-slate-800 pt-4 leading-none">
          VEGA Registry File
        </div>
      </div>

      {/* Main Column */}
      <div className="flex-1 p-10 flex flex-col justify-between">
        <div className="space-y-10">
          <div>
            <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2.5 py-1 rounded">Resume Document</span>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase mt-4 leading-none">{data?.full_name || "Applicant Name"}</h1>
          </div>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">Contact Info</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-sans font-medium text-slate-600">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                <p className="text-slate-800 truncate font-semibold mt-0.5">{data?.email}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                <p className="text-slate-800 font-semibold mt-0.5">{data?.contact}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Residential Location</p>
                <p className="text-slate-800 font-semibold mt-0.5">{data?.address}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">Active Deployments</h3>
            <div className="space-y-6">
              {(Array.isArray(data?.experience_json) ? data.experience_json : []).map((exp: any, i: number) => (
                <div key={i} className="text-xs font-sans">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-extrabold text-slate-850 uppercase tracking-tight">{exp.company}</h4>
                    <span className="font-mono text-slate-405 text-[9px] shrink-0">{exp.duration}</span>
                  </div>
                  <p className="text-[10px] text-cyan-600 font-black uppercase tracking-wider mb-2">{exp.role}</p>
                  <p className="text-slate-600 leading-relaxed font-sans">{exp.desc}</p>
                </div>
              ))}
              {(!data?.experience_json || data?.experience_json.length === 0 || data?.experience_type === 'FRESHER') && (
                <p className="text-xs text-slate-450 italic">Dynamic fresher specialized in tech content development, keyword research, and copywriting.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-450 border-b-2 border-slate-900 pb-2 mb-4">Key Projects</h3>
            <div className="space-y-5">
              {(Array.isArray(data?.projects_json) ? data.projects_json : []).slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="text-xs font-sans">
                  <div className="flex justify-between items-baseline mb-1">
                    <h5 className="font-extrabold text-slate-855 uppercase font-sans">{p.name}</h5>
                    <span className="font-mono text-slate-400 text-[9px]">{p.tech_stack}</span>
                  </div>
                  <p className="text-slate-550 leading-relaxed text-[11px] font-sans">{p.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---

export function ResumeBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("academic-latex");
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // 1: Check, 2: Select, 3: Preview/Download
  const [consentOpen, setConsentOpen] = useState(localStorage.getItem("consent_resume") !== "true");
  const [editedProfile, setEditedProfile] = useState<any>(null);
  const [sidebarMode, setSidebarMode] = useState<"editor" | "ai-opt">("editor");
  const [editorTab, setEditorTab] = useState<string>("personal");
  const [newSkillText, setNewSkillText] = useState("");
  const [saving, setSaving] = useState(false);
  const [xpBalance, setXpBalance] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(0.72); // Optimal scale to fit side-by-side deskview

  // ATS Optimization Feature State
  const [targetRole, setTargetRole] = useState("SDE / Full Stack Engineer");
  const [keywordsGenerating, setKeywordsGenerating] = useState(false);
  const [atsRecommendations, setAtsRecommendations] = useState<any>(null);

  const fetchAtsOptimizeRecommendations = async (role: string) => {
    setKeywordsGenerating(true);
    try {
      const response = await api.post("/ai/optimize-keywords", {
        skills: profile?.skills_json || [],
        targetRole: role
      });
      if (response.data.success) {
        setAtsRecommendations(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch Keyword suggestions:", err);
    } finally {
      setKeywordsGenerating(false);
    }
  };

  useEffect(() => {
    if (profile && currentStep === 3 && !atsRecommendations) {
      fetchAtsOptimizeRecommendations(targetRole);
    }
  }, [profile, currentStep]);
  
  const resumeRef = useRef<HTMLDivElement>(null);

  const { setPageContext } = useAccessibility();

  useEffect(() => {
    if (setPageContext && profile) {
      setPageContext({
        profile,
        currentStep,
        status,
        actions: {
          generate: handleGenerate,
          download: handleDownload,
          selectTemplate: (id: string) => setSelectedTemplate(id),
        }
      });
    }
  }, [profile, currentStep, status, setPageContext]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, templatesRes, profileRes, balanceRes] = await Promise.all([
        api.get(`/resume/status/${user?.id}`),
        api.get("/resume/templates"),
        api.get(`/students/profile/${user?.id}`),
        api.get("/xp/balance")
      ]);
      
      setStatus(statusRes.data);
      setTemplates(templatesRes.data);
      if (balanceRes.data?.success) {
        setXpBalance(balanceRes.data.balance.xp_balance);
      }
      if (profileRes.data.success) {
        // Parse JSON fields
        const data = profileRes.data.data;
        ['education_json', 'experience_json', 'projects_json', 'skills_json', 'social_links_json'].forEach(field => {
          if (typeof data[field] === 'string') {
            try { data[field] = JSON.parse(data[field]); } catch(e) { data[field] = []; }
          }
          if (!Array.isArray(data[field])) {
            data[field] = [];
          }
        });

        // Load custom sections from localStorage
        const storedCustomSecs = localStorage.getItem(`resume_custom_sections_${user?.id}`);
        if (storedCustomSecs) {
          try { data.custom_sections_json = JSON.parse(storedCustomSecs); } catch (e) { data.custom_sections_json = []; }
        } else {
          data.custom_sections_json = [];
        }
        if (!Array.isArray(data.custom_sections_json)) {
          data.custom_sections_json = [];
        }

        setProfile(data);
        setEditedProfile(JSON.parse(JSON.stringify(data)));
      }
      
      if (statusRes.data.isEligible) setCurrentStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAll = async () => {
    if (!editedProfile) return;
    setSaving(true);
    try {
      // 1. Save Personal Info
      await api.put(`/students/profile/${user?.id}/section/personal`, {
        fullName: editedProfile.full_name,
        headline: editedProfile.headline || "",
        dob: editedProfile.dob,
        gender: editedProfile.gender,
        address: editedProfile.address,
        location: editedProfile.location || editedProfile.address || "",
        contact: editedProfile.contact,
        profilePhotoUrl: editedProfile.profile_photo_url
      });

      // 2. Save Summary (which is in the local 'summary' React state)
      await api.put(`/students/profile/${user?.id}/section/summary`, {
        summary: summary
      });

      // 3. Save Skills
      await api.put(`/students/profile/${user?.id}/section/skills`, {
        skills: editedProfile.skills_json
      });

      // 4. Save Education
      const formattedEdu = (Array.isArray(editedProfile?.education_json) ? editedProfile.education_json : []).map((edu: any) => ({
        institution: edu.board || edu.school || edu.institution || "Unknown Institution",
        degree: edu.level || edu.degree || "Other",
        field_of_study: edu.field_of_study || "",
        start_date: edu.start_date || (edu.year ? `${edu.year}-01-01` : "2020-01-01"),
        end_date: edu.end_date || (edu.year ? `${edu.year}-05-01` : "2024-05-01"),
        grade: String(edu.percentage || edu.cgpa || edu.grade || "")
      })) || [];
      await api.put(`/students/profile/${user?.id}/section/education`, {
        education: formattedEdu
      });

      // 5. Save Experience
      const formattedExp = (Array.isArray(editedProfile?.experience_json) ? editedProfile.experience_json : []).map((exp: any) => ({
        company: exp.company || "Unknown Company",
        role: exp.role || "Employee",
        duration: exp.duration || "2024",
        desc: exp.desc || exp.description || "",
        start_date: exp.start_date || "2023-01-01",
        end_date: exp.end_date || "2024-01-01"
      })) || [];
      await api.put(`/students/profile/${user?.id}/section/experience`, {
        experience: formattedExp
      });

      // 6. Save Projects
      const formattedProj = (Array.isArray(editedProfile?.projects_json) ? editedProfile.projects_json : []).map((p: any) => ({
        title: p.name || p.title || "Project",
        description: p.description || p.desc || "",
        tech_stack: p.tech_stack || p.stack || "",
        link: p.link || ""
      })) || [];
      await api.put(`/students/profile/${user?.id}/section/projects`, {
        projects: formattedProj
      });

      // 7. Save Custom Sections to LocalStorage (Durable Client Cache)
      localStorage.setItem(`resume_custom_sections_${user?.id}`, JSON.stringify(editedProfile.custom_sections_json || []));

      // Synchronize in memory
      setProfile(JSON.parse(JSON.stringify(editedProfile)));
      alert("Resume edits successfully updated and saved to your profile!");
    } catch (error) {
      console.error("Error saving resume sections:", error);
      alert("Edits applied directly to preview. Your live PDF will contain all changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillText.trim()) return;
    const currentSkills = editedProfile?.skills_json || [];
    if (!currentSkills.includes(newSkillText.trim())) {
      setEditedProfile({
        ...editedProfile,
        skills_json: [...currentSkills, newSkillText.trim()]
      });
    }
    setNewSkillText("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const currentSkills = editedProfile?.skills_json || [];
    setEditedProfile({
      ...editedProfile,
      skills_json: currentSkills.filter((s: string) => s !== skillToRemove)
    });
  };

  const handleAddExperience = () => {
    const currentExp = editedProfile?.experience_json || [];
    setEditedProfile({
      ...editedProfile,
      experience_json: [
        ...currentExp,
        { company: "New Company", role: "Software Engineer", duration: "2026", desc: "Describe your job responsibilities here." }
      ]
    });
  };

  const handleRemoveExperience = (index: number) => {
    const currentExp = editedProfile?.experience_json || [];
    setEditedProfile({
      ...editedProfile,
      experience_json: currentExp.filter((_: any, idx: number) => idx !== index)
    });
  };

  const handleUpdateExperience = (index: number, key: string, val: string) => {
    const currentExp = [...(editedProfile?.experience_json || [])];
    currentExp[index] = { ...currentExp[index], [key]: val };
    setEditedProfile({ ...editedProfile, experience_json: currentExp });
  };

  const handleAddProject = () => {
    const currentProj = editedProfile?.projects_json || [];
    setEditedProfile({
      ...editedProfile,
      projects_json: [
        ...currentProj,
        { name: "New Project", tech_stack: "React, NodeJS", description: "A summary of implementation steps." }
      ]
    });
  };

  const handleRemoveProject = (index: number) => {
    const currentProj = editedProfile?.projects_json || [];
    setEditedProfile({
      ...editedProfile,
      projects_json: currentProj.filter((_: any, idx: number) => idx !== index)
    });
  };

  const handleUpdateProject = (index: number, key: string, val: string) => {
    const currentProj = [...(editedProfile?.projects_json || [])];
    currentProj[index] = { ...currentProj[index], [key]: val };
    setEditedProfile({ ...editedProfile, projects_json: currentProj });
  };

  const handleAddEducation = () => {
    const currentEdu = editedProfile?.education_json || [];
    setEditedProfile({
      ...editedProfile,
      education_json: [
        ...currentEdu,
        { school: "Institution Name", level: "Degree / Course", year: "2026", cgpa: "9.0" }
      ]
    });
  };

  const handleRemoveEducation = (index: number) => {
    const currentEdu = editedProfile?.education_json || [];
    setEditedProfile({
      ...editedProfile,
      education_json: currentEdu.filter((_: any, idx: number) => idx !== index)
    });
  };

  const handleUpdateEducation = (index: number, key: string, val: string) => {
    const currentEdu = [...(editedProfile?.education_json || [])];
    currentEdu[index] = { ...currentEdu[index], [key]: val };
    setEditedProfile({ ...editedProfile, education_json: currentEdu });
  };

  const handleAddCustomSection = () => {
    const currentCustom = editedProfile?.custom_sections_json || [];
    setEditedProfile({
      ...editedProfile,
      custom_sections_json: [
        ...currentCustom,
        { id: 'custom-' + Date.now(), title: "Awards & Activities", content: "• Won 1st place in National Hackathon 2025.\n• Contributed to open source." }
      ]
    });
  };

  const handleRemoveCustomSection = (id: string) => {
    const currentCustom = editedProfile?.custom_sections_json || [];
    setEditedProfile({
      ...editedProfile,
      custom_sections_json: currentCustom.filter((s: any) => s.id !== id)
    });
  };

  const handleUpdateCustomSection = (id: string, key: string, val: string) => {
    const currentCustom = [...(editedProfile?.custom_sections_json || [])];
    const idx = currentCustom.findIndex(s => s.id === id);
    if (idx !== -1) {
      currentCustom[idx] = { ...currentCustom[idx], [key]: val };
      setEditedProfile({ ...editedProfile, custom_sections_json: currentCustom });
    }
  };

  const handleGenerate = async () => {
    if (status.dailyCount >= status.limit) {
      if (xpBalance < (status.xpCost || 50)) {
        alert("Insufficient XP balance. Please purchase more XP to generate extra resumes.");
        return;
      }
      const confirmSpend = window.confirm(`You have reached your daily limit of ${status.limit} resumes. Spending ${status.xpCost || 50} XP to generate another resume?`);
      if (!confirmSpend) return;
    }
    setGenerating(true);
    try {
      // 1. Generate AI Summary on Frontend (As per system instructions)
      let aiSummary = "";
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const skills = profile.skills_json || [];
          const projects = profile.projects_json || [];
          
          const prompt = `Write a 2-3 line ATS-friendly professional summary for a student with these details:
            Skills: ${skills.join(", ")}
            Projects: ${projects.map((pr: any) => pr.name).join(", ")}
            Professional Bio: ${profile.bio}
            Focus on being concise and high-impact. Wrap it in quotes.`;

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          aiSummary = response.text || "";
        }
      } catch (aiErr) {
        console.error("AI Generation Error:", aiErr);
      }

      // Fallback Summary if AI fails or no key
      if (!aiSummary) {
        const skills = profile.skills_json || [];
        aiSummary = `Motivated student athlete and upcoming professional with expertise in ${skills.slice(0, 3).join(", ")}. Passionate about building innovative solutions and collaborating on impactful projects.`;
      }

      // 2. Notify Backend to track usage & save history
      const { data } = await api.post("/resume/generate", { 
        userId: user?.id, 
        templateId: selectedTemplate,
        summary: aiSummary
      });

      if (data.success) {
        setSummary(aiSummary);
        setCurrentStep(3);
        // Refresh status and wallet balance to update daily count
        const [statusRes, balanceRes] = await Promise.all([
          api.get(`/resume/status/${user?.id}`),
          api.get("/xp/balance")
        ]);
        setStatus(statusRes.data);
        if (balanceRes.data?.success) {
          setXpBalance(balanceRes.data.balance.xp_balance);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to finalize resume generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('resume-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`VEGA_Resume_${profile.full_name?.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Try disabling any CORS blocking extensions.");
    }
  };

  const calculateScore = () => {
    if (!profile) return 0;
    let score = 30; // Base score for having an account
    if (profile.completeness_score > 80) score += 20;
    if (profile.skills_json?.length >= 5) score += 15;
    if (profile.projects_json?.length >= 2) score += 15;
    if (profile.profile_photo_url) score += 10;
    if (profile.experience_type !== 'FRESHER' || profile.experience_json?.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const resumeScore = calculateScore();

  if (!status) return null;

  return (
    <div className="max-w-7xl mx-auto py-2 font-sans text-slate-800">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2.5xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">AI Resume Builder</h1>
                <p className="text-slate-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.3em] mt-2">OPTIMIZE AND EXPORT PLACEMENT PROFILES</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-white border border-slate-150 p-3 rounded-2xl shadow-sm justify-between">
              <div className="flex items-center gap-3">
                <div className="text-left md:text-right">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Daily Limit</div>
                   <div className="text-xs sm:text-sm font-black text-slate-800 leading-none">{status.dailyCount}/{status.limit} Generated</div>
                </div>
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                   <Sparkles size={18} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-150 p-3 rounded-2xl shadow-sm justify-between">
              <div className="flex items-center gap-3">
                <div className="text-left md:text-right">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Talent Wallet</div>
                   <div className="text-xs sm:text-sm font-black text-amber-600 leading-none font-mono">{xpBalance} XP</div>
                </div>
                <Link to="/xp-store" className="w-9 h-9 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0 transition-colors" title="Purchase XP points">
                   <Coins size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
           <StepBadge active={currentStep >= 1} done={currentStep > 1} label="Eligibility" icon={<CheckCircle2 size={13} />} />
           <div className="w-8 h-px bg-slate-200" />
           <StepBadge active={currentStep >= 2} done={currentStep > 2} label="Template" icon={<Layout size={13} />} />
           <div className="w-8 h-px bg-slate-200" />
           <StepBadge active={currentStep >= 3} done={currentStep > 3} label="Download" icon={<Download size={13} />} />
        </div>

        <AnimatePresence mode="wait">
           {currentStep === 1 && (
             <motion.div 
               key="step1"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 1.05 }}
               className="max-w-2xl mx-auto text-center"
             >
                <div className="p-12 glass-card border-slate-200 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Sparkles size={120} className="text-indigo-600" />
                   </div>
                   
                   <div className="relative z-10">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                         <AlertTriangle size={32} />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Access Locked</h2>
                      <p className="text-slate-500 font-medium mb-8">Professional resume generation requires a robust profile. Please complete the following requirements to proceed.</p>
                      
                      <div className="space-y-3 mb-10 text-left">
                         {status.errors.map((err: string, i: number) => (
                           <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-items-center">
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{err}</span>
                           </div>
                         ))}
                      </div>

                      <Link to="/profile" className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-105 transition-all">
                         Complete Profile Now
                      </Link>
                   </div>
                </div>
             </motion.div>
           )}

           {currentStep === 2 && (
             <motion.div 
               key="step2"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="space-y-8 max-w-7xl mx-auto px-4"
             >
                <div className="text-center max-w-2xl mx-auto mb-6">
                   <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Choose Your Template</h2>
                   <p className="text-sm text-slate-500 font-medium tracking-tight">Select a high-parse rate format. All templates are fully optimized for corporate screener parsing.</p>
                </div>

                {status.dailyCount >= status.limit && (
                  <div className="max-w-2xl mx-auto p-5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left shadow-sm mb-6">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Coins size={22} className="text-amber-600 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-900 uppercase tracking-wider mb-0.5">Daily Free Limit Fully Redeemed ({status.dailyCount}/{status.limit})</p>
                        <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                          Generating an extra resume will utilize <span className="font-extrabold text-amber-700 font-mono">{status.xpCost || 50} XP</span> from your wallet balance.
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="text-right font-sans">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Wallet balance</span>
                        <span className={`text-xs font-black font-mono ${xpBalance >= (status.xpCost || 50) ? 'text-emerald-600' : 'text-red-500'}`}>{xpBalance} XP</span>
                      </div>
                      {xpBalance < (status.xpCost || 50) && (
                        <Link to="/xp-store" className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase px-4 py-2 rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center gap-1">
                          <Plus size={12} /> Buy XP
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {templates.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`relative group cursor-pointer rounded-3xl overflow-hidden border-2 transition-all ${selectedTemplate === t.id ? 'border-indigo-600 shadow-xl ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-150'}`}
                    >
                        <div className="aspect-[3/4] bg-slate-50 p-4 border-b border-slate-100 overflow-hidden relative">
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent z-10" />
                           <div className="transition-all duration-500 transform scale-[0.32] sm:scale-[0.28] md:scale-[0.33] lg:scale-[0.29] xl:scale-[0.25] origin-top-left group-hover:translate-x-0.5 group-hover:translate-y-0.5">
                              {t.id === 'academic-latex' && <AcademicLatexTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                              {t.id === 'marketer-gold-timeline' && <MarketerGoldTimelineTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'hybrid-ats-premium' && <HybridATSPremiumTemplate data={profile} summary="Optimized premium formatted ATS-certified layout with full parsing guarantees." />}
                              {t.id === 'silicon-valley-tech' && <SiliconValleyTechTemplate data={profile} summary="Silicon Valley modern single-column layout highlighting impact metrics." />}
                              {t.id === 'modern-pro' && <ModernProTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'designer-black-sidebar' && <DesignerBlackSidebarTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'executive-grid' && <ExecutiveGridTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'medical-care-professional' && <MedicalCareProfessionalTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                              {t.id === 'minimal-swiss' && <MinimalSwissTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                              {t.id === 'textured-slate-serif' && <TexturedSlateSerifTemplate data={profile} summary="Sample Summary for previewing layout..." />}
                              {t.id === 'technical-elite' && <TechnicalEliteTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'creative-pastel-frame' && <CreativePastelFrameTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'creative-min' && <CreativeMinTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'asymmetrical-writer' && <AsymmetricalWriterTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {t.id === 'classic-ats' && <ClassicATSTemplate data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />}
                              {!['academic-latex', 'marketer-gold-timeline', 'hybrid-ats-premium', 'silicon-valley-tech', 'modern-pro', 'designer-black-sidebar', 'executive-grid', 'medical-care-professional', 'minimal-swiss', 'textured-slate-serif', 'technical-elite', 'creative-pastel-frame', 'creative-min', 'asymmetrical-writer', 'classic-ats'].includes(t.id) && (
                                <DynamicTemplate id={t.id} data={profile} summary="Sample Summary for previewing layout..." photo={profile?.profile_photo_url} />
                              )}
                           </div>
                        </div>
                       <div className="p-4 sm:p-5 bg-white relative z-20">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                             <h4 className="font-bold text-slate-900 text-sm tracking-tight line-clamp-1 uppercase" title={t.name}>{t.name}</h4>
                             <span className="shrink-0 text-[8px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100/50 uppercase">
                                {t.type?.replace('_', ' ')}
                             </span>
                          </div>
                          <p className="text-[11px] text-slate-450 font-medium italic line-clamp-2 leading-relaxed" title={t.description}>{t.description}</p>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center gap-2 pt-8">
                   <button 
                     onClick={handleGenerate}
                     disabled={generating || (status.dailyCount >= status.limit && xpBalance < (status.xpCost || 50))}
                     className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                   >
                     {generating 
                       ? "Crafting AI Resume..." 
                       : status.dailyCount >= status.limit 
                         ? <><Sparkles size={24} /> Pay {status.xpCost || 50} XP & Generate</> 
                         : <><Sparkles size={24} /> Generate Professional Resume</>
                     }
                   </button>
                   {status.dailyCount >= status.limit && xpBalance < (status.xpCost || 50) && (
                     <p className="text-xs text-red-500 font-black uppercase tracking-wider mt-1 flex items-center gap-1">
                       <AlertCircle size={14} /> Insufficient XP in wallet to purchase additional resumes.
                     </p>
                   )}
                </div>
             </motion.div>
           )}

           {currentStep === 3 && (
             <motion.div 
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row gap-12"
             >
                {/* Control Panel with Tabs */}
                <aside className="w-full lg:w-[450px] shrink-0 space-y-6">
                    {/* Navigation Mode Selector */}
                    <div className="flex bg-slate-100 p-1.5 rounded-[24px] gap-1 border border-slate-200 mb-6">
                      <button
                        type="button"
                        onClick={() => setSidebarMode("editor")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all ${sidebarMode === "editor" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        <Edit3 size={13} /> Resume Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarMode("ai-opt")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all ${sidebarMode === "ai-opt" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        <Sparkles size={13} /> AI ATS Optimizer
                      </button>
                    </div>
                    {sidebarMode === "editor" ? (
                      /* RESUME EDITOR MAIN PANEL */
                      <div className="bg-white rounded-[40px] p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Resume Document Fields</h4>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">Type in any field to update the live preview layout instantly.</p>
                        </div>

                        {/* Editor Section Headers */}
                        <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar border-b border-slate-100">
                          {[
                            { id: "personal", label: "Details", icon: <User size={12} /> },
                            { id: "experience", label: "Work", icon: <Briefcase size={12} /> },
                            { id: "education", label: "Academic", icon: <GraduationCap size={12} /> },
                            { id: "projects", label: "Projects", icon: <Code size={12} /> },
                            { id: "skills", label: "Skills", icon: <Cpu size={12} /> },
                            { id: "custom", label: "Custom", icon: <Edit3 size={12} /> },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setEditorTab(tab.id)}
                              className={`flex items-center gap-1 py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${editorTab === tab.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              {tab.icon}
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Tab Contents */}
                        <div className="min-h-[200px]">
                          {editorTab === "personal" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Full Name</label>
                                <input
                                  type="text"
                                  value={editedProfile?.full_name || ""}
                                  onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                  placeholder="Full Name"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Headline</label>
                                <input
                                  type="text"
                                  value={editedProfile?.headline || ""}
                                  onChange={(e) => setEditedProfile({ ...editedProfile, headline: e.target.value })}
                                  className="w-full text-xs font-bold text-slate-805 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                  placeholder="SDE / Full Stack Developer"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Contact Number</label>
                                  <input
                                    type="text"
                                    value={editedProfile?.contact || ""}
                                    onChange={(e) => setEditedProfile({ ...editedProfile, contact: e.target.value })}
                                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                    placeholder="Phone number"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans font-sans">Address / City</label>
                                  <input
                                    type="text"
                                    value={editedProfile?.address || editedProfile?.location || ""}
                                    onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value, location: e.target.value })}
                                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                    placeholder="e.g. San Francisco, CA"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Contact Email</label>
                                <input
                                  type="text"
                                  value={editedProfile?.email || ""}
                                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                  placeholder="Email Address"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Professional Summary</label>
                                <textarea
                                  rows={5}
                                  value={summary}
                                  onChange={(e) => setSummary(e.target.value)}
                                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all leading-normal font-sans"
                                  placeholder="Enter professional summary paragraph to render on resume..."
                                />
                              </div>
                            </div>
                          )}

                          {editorTab === "experience" && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience ({editedProfile?.experience_json?.length || 0})</span>
                                <button
                                  type="button"
                                  onClick={handleAddExperience}
                                  className="text-[10px] font-black text-indigo-650 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-800"
                                >
                                  <Plus size={11} /> Add Role
                                </button>
                              </div>
                              
                              {(editedProfile?.experience_json || []).length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-xs text-slate-400 font-sans">No work experience entries yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar-all font-sans">
                                  {(Array.isArray(editedProfile?.experience_json) ? editedProfile.experience_json : []).map((exp, index) => (
                                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative space-y-3 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExperience(index)}
                                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 hover:scale-110 transition-all font-sans font-bold"
                                        title="Delete experience"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Company</label>
                                          <input
                                            type="text"
                                            value={exp.company || ""}
                                            onChange={(e) => handleUpdateExperience(index, "company", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1 font-sans">Role</label>
                                          <input
                                            type="text"
                                            value={exp.role || ""}
                                            onChange={(e) => handleUpdateExperience(index, "role", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Duration / Years</label>
                                          <input
                                            type="text"
                                            value={exp.duration || ""}
                                            onChange={(e) => handleUpdateExperience(index, "duration", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                            placeholder="e.g. 2024 - Present"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Start Date</label>
                                          <input
                                            type="text"
                                            value={exp.start_date || ""}
                                            onChange={(e) => handleUpdateExperience(index, "start_date", e.target.value)}
                                            className="w-full text-xs font-sans text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                            placeholder="YYYY-MM-DD"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-405 mb-1">Job Description</label>
                                        <textarea
                                          rows={2}
                                          value={exp.desc || exp.description || ""}
                                          onChange={(e) => handleUpdateExperience(index, exp.desc !== undefined ? "desc" : "description", e.target.value)}
                                          className="w-full text-xs text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none leading-normal font-sans"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {editorTab === "education" && (
                            <div className="space-y-4 font-sans">
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Records ({editedProfile?.education_json?.length || 0})</span>
                                <button
                                  type="button"
                                  onClick={handleAddEducation}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-800"
                                >
                                  <Plus size={11} /> Add Education
                                </button>
                              </div>

                              {(editedProfile?.education_json || []).length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-xs text-slate-400 font-sans">No education entries yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar font-sans font-medium">
                                  {(Array.isArray(editedProfile?.education_json) ? editedProfile.education_json : []).map((edu, index) => (
                                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative space-y-3 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEducation(index)}
                                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 hover:scale-110 transition-all font-sans font-bold"
                                        title="Delete education"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-400 mb-1">Institution Name</label>
                                        <input
                                          type="text"
                                          value={edu.board || edu.school || edu.institution || ""}
                                          onChange={(e) => handleUpdateEducation(index, edu.board ? "board" : edu.school ? "school" : "institution", e.target.value)}
                                          className="w-full text-xs font-bold text-slate-808 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                        />
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                          <label className="block text-[8px] font-black text-slate-405 mb-1">Degree / Level</label>
                                          <input
                                            type="text"
                                            value={edu.level || edu.degree || ""}
                                            onChange={(e) => handleUpdateEducation(index, edu.level ? "level" : "degree", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Grading</label>
                                          <input
                                            type="text"
                                            value={edu.cgpa || edu.percentage || edu.grade || ""}
                                            onChange={(e) => handleUpdateEducation(index, edu.cgpa ? "cgpa" : edu.percentage ? "percentage" : "grade", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1 font-sans">Year / Period</label>
                                          <input
                                            type="text"
                                            value={edu.year || edu.duration || ""}
                                            onChange={(e) => handleUpdateEducation(index, edu.year ? "year" : "duration", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Field of Study</label>
                                          <input
                                            type="text"
                                            value={edu.field_of_study || ""}
                                            onChange={(e) => handleUpdateEducation(index, "field_of_study", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {editorTab === "projects" && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Project Entries ({editedProfile?.projects_json?.length || 0})</span>
                                <button
                                  type="button"
                                  onClick={handleAddProject}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-800"
                                >
                                  <Plus size={11} /> Add Project
                                </button>
                              </div>

                              {(editedProfile?.projects_json || []).length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-xs text-slate-400 font-sans">No project entries yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar font-sans font-sans">
                                  {(Array.isArray(editedProfile?.projects_json) ? editedProfile.projects_json : []).map((proj, index) => (
                                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative space-y-3 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveProject(index)}
                                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 hover:scale-110 transition-all font-sans font-bold"
                                        title="Delete project"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-400 mb-1">Project Title</label>
                                        <input
                                          type="text"
                                          value={proj.name || proj.title || ""}
                                          onChange={(e) => handleUpdateProject(index, proj.name ? "name" : "title", e.target.value)}
                                          className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1">Tech Stack</label>
                                          <input
                                            type="text"
                                            value={proj.tech_stack || proj.stack || ""}
                                            onChange={(e) => handleUpdateProject(index, proj.tech_stack ? "tech_stack" : "stack", e.target.value)}
                                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                            placeholder="e.g. React, NodeJS"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] font-black text-slate-400 mb-1 font-sans">Project Link</label>
                                          <input
                                            type="text"
                                            value={proj.link || ""}
                                            onChange={(e) => handleUpdateProject(index, "link", e.target.value)}
                                            className="w-full text-xs font-sans text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                            placeholder="https://github.com/..."
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-400 mb-1">Project Description</label>
                                        <textarea
                                          rows={2}
                                          value={proj.description || proj.desc || ""}
                                          onChange={(e) => handleUpdateProject(index, proj.description !== undefined ? "description" : "desc", e.target.value)}
                                          className="w-full text-xs text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none leading-normal font-sans"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {editorTab === "skills" && (
                            <div className="space-y-4">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-bold">Skills Portfolio</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newSkillText}
                                  onChange={(e) => setNewSkillText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                  className="flex-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-150 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-sans"
                                  placeholder="Add skill (e.g. React, Python)"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddSkill}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shrink-0 font-sans font-sans"
                                >
                                  <Plus size={14} /> Add
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50 rounded-3xl border border-slate-100 max-h-[220px] overflow-y-auto no-scrollbar font-sans font-medium">
                                {(editedProfile?.skills_json || []).length === 0 ? (
                                  <p className="text-xs text-slate-400 py-3 mx-auto font-sans">No skills added yet.</p>
                                ) : (
                                  (Array.isArray(editedProfile?.skills_json) ? editedProfile.skills_json : []).map((skill) => (
                                    <span
                                      key={skill}
                                      className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-705 pl-3 pr-2 py-1.5 rounded-xl border border-slate-150 shadow-sm font-sans"
                                    >
                                      {skill}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSkill(skill)}
                                        className="text-rose-500 hover:text-rose-700 font-bold p-0.5"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {editorTab === "custom" && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans">Custom Sections ({editedProfile?.custom_sections_json?.length || 0})</span>
                                <button
                                  type="button"
                                  onClick={handleAddCustomSection}
                                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-805 font-sans"
                                >
                                  <Plus size={11} /> Add Section
                                </button>
                              </div>

                              {(editedProfile?.custom_sections_json || []).length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-xs text-slate-400 font-sans">No custom sections added yet.</p>
                                </div>
                              ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar font-sans font-medium">
                                  {(Array.isArray(editedProfile?.custom_sections_json) ? editedProfile.custom_sections_json : []).map((section, index) => (
                                    <div key={section.id || index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative space-y-3 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomSection(section.id)}
                                        className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 hover:scale-110 transition-all font-sans font-bold"
                                        title="Delete section"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-400 mb-1">Section Title</label>
                                        <input
                                          type="text"
                                          value={section.title || ""}
                                          onChange={(e) => handleUpdateCustomSection(section.id, "title", e.target.value)}
                                          className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none"
                                          placeholder="e.g. Certifications, Languages"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-black text-slate-400 mb-1">Section Content</label>
                                        <textarea
                                          rows={3}
                                          value={section.content || ""}
                                          onChange={(e) => handleUpdateCustomSection(section.id, "content", e.target.value)}
                                          className="w-full text-xs text-slate-800 bg-white border border-slate-150 p-2 rounded-xl outline-none leading-normal font-sans"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Save Button */}
                        <div className="pt-2 border-t border-slate-50 font-sans">
                          <button 
                            type="button"
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] transition-all disabled:opacity-50 font-sans font-bold"
                          >
                            <Save size={14} /> {saving ? "Saving Changes..." : "Save Profile Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE AI CARD FOR OPTIMIZER MODE */
                      <>
                        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                           <div className="mb-4">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-sans font-bold">AI Summary Result</div>
                              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-sm italic text-indigo-700 leading-relaxed font-sans font-medium">
                                 "${summary}"
                              </div>
                           </div>
                        </div>

                        <div className="bg-emerald-600 text-white rounded-[40px] p-8 animate-fadeIn">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <CheckCircle size={24} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">ATS Verified</span>
                              </div>
                              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-black">
                                 Score: ${resumeScore}/100
                              </div>
                           </div>
                           <p className="text-lg font-bold tracking-tight">Your resume is ready for submission.</p>
                           <p className="text-xs text-emerald-200 mt-2 font-sans font-medium">Format: PDF/A4 standard optimized for industry parsers including Workday and Taleo.</p>
                        </div>

                        {/* Interactive ATS Audit Summary */}
                        <div className="bg-slate-900 text-white rounded-[40px] p-8 space-y-6">
                           <div className="flex items-center gap-2">
                             <Trophy className="text-yellow-400 font-bold" size={20} />
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">ATS Auditor Report</h4>
                           </div>

                           <div className="space-y-3 text-xs">
                             <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/30">
                               <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                                 <span>Layout Parse Rating</span>
                                 <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">100% SECURE</span>
                               </div>
                               <p className="text-[10px] text-slate-400 font-sans">
                                 {`['hybrid-ats-premium', 'silicon-valley-tech', 'classic-ats', 'academic-latex'].includes(selectedTemplate) 
                                   ? "Perfect. Pure single-column linear standard format guarantees parse safety across corporate systems."
                                   : "This grid-based system may experience sequence offset on older legacy screeners. Use 'Hybrid ATS Premium' for absolute parse security."`}
                               </p>
                             </div>

                             <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/30">
                               <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                                 <span>Aspirant Section Coverage</span>
                                 <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono font-sans font-sans">VERIFIED</span>
                               </div>
                               <div className="space-y-1 mt-1.5 text-[10px] text-slate-400 font-medium font-sans font-sans font-mono">
                                 <div className="flex items-center gap-1.5 font-sans">
                                   <span className="text-emerald-400 font-boldfont-sans">✔</span> Social URLs Recognized ({`profile?.social_links_json?.linkedin ? 'LinkedIn Configured' : 'Fallback active'`})
                                 </div>
                                 <div className="flex items-center gap-1.5 font-sans">
                                   <span className="text-emerald-400 font-bold font-sans font-mono">✔</span> Standard Section Labels (Experience, Skills, Projects)
                                 </div>
                               </div>
                             </div>

                             <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-705/30">
                               <div className="flex justify-between items-center text-slate-200 font-bold mb-1">
                                 <span>Quantifiable Metric Ratio</span>
                                 <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${profile?.projects_json?.some((p) => /\\d+%|\\d+\\s*ms|\\d+\\s*x/i.test(p.description)) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                   {`profile?.projects_json?.some((p) => /\\d+%|\\d+\\s*ms|\\d+\\s*x/i.test(p.description)) ? 'OPTIMUM' : 'ALERT'`}
                                 </span>
                               </div>
                               <p className="text-[10px] text-slate-400 leading-normal font-sans">
                                 {`profile?.projects_json?.some((p) => /\\d+%|\\d+\\s*ms|\\d+\\s*x/i.test(p.description))
                                   ? "Excellent. Numeric achievements are recognized in your descriptions. This highlights direct business/engineering execution impact."
                                   : "Tip: Add quantitative metrics standard for SDE (e.g., 'rendered 40% faster', 'scaled user endpoints by 2x') to increase ATS rating."`}
                               </p>
                             </div>
                           </div>
                        </div>

                        {/* SEO Real-Time Role Optimizer Panel */}
                        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 space-y-6">
                           <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <Brain className="text-indigo-600" size={18} />
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">Target Role SEO Matcher</h4>
                               </div>
                               {keywordsGenerating && <RefreshCw size={12} className="animate-spin text-indigo-600" />}
                             </div>
                             <p className="text-xs text-slate-455 font-medium">Select your aspiration role to optimize matching resume phrasing.</p>
                           </div>

                           <div className="relative font-sans font-medium">
                             <select 
                               value={targetRole}
                               onChange={(e) => {
                                 setTargetRole(e.target.value);
                                 fetchAtsOptimizeRecommendations(e.target.value);
                               }}
                               className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all appearance-none"
                             >
                               <option value="SDE / Full Stack Engineer font-sans text-xs">SDE / Full Stack Engineer</option>
                               <option value="Frontend Development Specialist font-sans text-xs font-semibold">Frontend Development Specialist (React)</option>
                               <option value="Backend & Cloud Infrastructure font-sans font-sans">Backend & Cloud Infrastructure</option>
                               <option value="AI / ML & Data Analytics Specialist font-sans">AI / ML & Data Analytics Specialist</option>
                               <option value="Product Manager & QA Engineer font-sans font-bold">Product Manager & QA Engineer</option>
                             </select>
                             <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-sans font-bold">▼</div>
                           </div>

                           <div className="space-y-4 pt-2 font-sans font-medium">
                             {keywordsGenerating ? (
                               <div className="py-8 text-center space-y-2">
                                 <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Querying Gemini ATS Database...</p>
                               </div>
                             ) : atsRecommendations ? (
                               <div className="space-y-5">
                                 {/* Missing terms list */}
                                 <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                     <Zap size={10} className="text-amber-500 font-bold" /> ATS Targeted Phrases
                                   </p>
                                   <div className="flex flex-wrap gap-1.5 font-sans">
                                     {atsRecommendations.missingKeywords?.map((kw) => (
                                       <span key={kw} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100/50 font-sans">
                                         {kw}
                                       </span>
                                     ))}
                                   </div>
                                 </div>

                                 {/* Recommended actions verbs */}
                                 <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 font-sans">
                                     Recommended Core Verbs
                                   </p>
                                   <div className="flex flex-wrap gap-1 font-sans">
                                     {atsRecommendations.recommendedVerbs?.map((vb) => (
                                       <span key={vb} className="text-[9px] font-mono font-bold bg-slate-50 text-slate-655 px-2 py-0.5 rounded border border-slate-100 font-sans">
                                         {vb}
                                       </span>
                                     ))}
                                   </div>
                                 </div>

                                 {/* Live sentence rewrites recommendation */}
                                 <div className="space-y-3 font-sans">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans font-bold">
                                     High-Score Bullet Rewrites
                                   </p>
                                   <div className="space-y-3 text-[11px] font-sans">
                                     {atsRecommendations.bulletRewrites?.slice(0, 2).map((rewrite, i) => (
                                       <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden font-sans">
                                         <div className="text-[8px] font-extrabold text-slate-400 uppercase mb-1 font-sans font-semibold">Standard / Passive Statement</div>
                                         <p className="text-slate-500 line-through mb-2 font-sans">"${rewrite.originalIdea}"</p>
                                         <div className="text-[8px] font-extrabold text-indigo-600 uppercase mb-1 font-sans font-serif">High-ATS Score Metric rewrite</div>
                                         <p className="text-indigo-900 font-bold bg-indigo-50/50 p-2 rounded-xl italic font-serif">"${rewrite.rewrittenBullet}"</p>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <button
                                 onClick={() => fetchAtsOptimizeRecommendations(targetRole)}
                                 className="w-full flex items-center justify-center gap-2 py-3 border border-indigo-200 text-indigo-600 rounded-2xl font-bold text-xs"
                               >
                                 <Brain size={14} /> Scan Terminology Recommendation
                               </button>
                             )}
                           </div>
                        </div>
                      </>
                    )}
                </aside>

                {/* Live Preview Screen */}
                <div className="flex-1 min-w-0 space-y-6">
                   <div className="flex items-center justify-between px-4 bg-white/70 border border-slate-100 py-3 rounded-[24px] shadow-sm">
                      <div className="flex items-center gap-2">
                         <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Live Document Preview</h3>
                         <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-black uppercase border border-indigo-100">A4 Standard</span>
                      </div>
                      
                      {/* Interactive Zoom Control */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setPreviewZoom(Math.max(0.4, Number((previewZoom - 0.05).toFixed(2))))} 
                          className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-black transition-all flex items-center justify-center border border-slate-150 text-sm active:scale-95 cursor-pointer"
                          title="Zoom Out"
                        >
                          -
                        </button>
                        <span className="text-[10px] font-mono font-black text-indigo-700 w-12 text-center select-none">
                          {Math.round(previewZoom * 100)}%
                        </span>
                        <button 
                          type="button"
                          onClick={() => setPreviewZoom(Math.min(1.2, Number((previewZoom + 0.05).toFixed(2))))} 
                          className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-600 rounded-lg font-black transition-all flex items-center justify-center border border-slate-150 text-sm active:scale-95 cursor-pointer"
                          title="Zoom In"
                        >
                          +
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(0.72)}
                          className="text-[9px] font-black uppercase text-indigo-600 hover:bg-white rounded-lg px-2.5 py-1 transition-all pointer-events-auto"
                        >
                          Fit
                        </button>
                      </div>
                   </div>
                   
                   <div className="w-full bg-slate-100/65 border border-slate-200/60 rounded-[36px] flex justify-center p-4 sm:p-6 shadow-inner overflow-hidden min-h-[500px]">
                      <div 
                        style={{ 
                          width: `${794 * previewZoom}px`, 
                          height: `${1123 * previewZoom}px`,
                          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                        }} 
                        className="relative shrink-0 overflow-hidden"
                      >
                         <div 
                           style={{ 
                             transform: `scale(${previewZoom})`, 
                             transformOrigin: "top left", 
                             width: "210mm", 
                             height: "297mm",
                             transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                           }}
                           className="absolute top-0 left-0 bg-white shadow-xl hover:shadow-2xl border border-slate-200/50 rounded-2xl overflow-hidden shrink-0"
                         >
                             {selectedTemplate === 'hybrid-ats-premium' && <HybridATSPremiumTemplate data={editedProfile || profile} summary={summary} />}
                             {selectedTemplate === 'silicon-valley-tech' && <SiliconValleyTechTemplate data={editedProfile || profile} summary={summary} />}
                            {selectedTemplate === 'academic-latex' && <AcademicLatexTemplate data={editedProfile || profile} summary={summary} />}
                            {selectedTemplate === 'classic-ats' && <ClassicATSTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'modern-pro' && <ModernProTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'executive-grid' && <ExecutiveGridTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'minimal-swiss' && <MinimalSwissTemplate data={editedProfile || profile} summary={summary} />}
                            {selectedTemplate === 'technical-elite' && <TechnicalEliteTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'creative-min' && <CreativeMinTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'marketer-gold-timeline' && <MarketerGoldTimelineTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'designer-black-sidebar' && <DesignerBlackSidebarTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'medical-care-professional' && <MedicalCareProfessionalTemplate data={editedProfile || profile} summary={summary} />}
                            {selectedTemplate === 'textured-slate-serif' && <TexturedSlateSerifTemplate data={editedProfile || profile} summary={summary} />}
                            {selectedTemplate === 'creative-pastel-frame' && <CreativePastelFrameTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {selectedTemplate === 'asymmetrical-writer' && <AsymmetricalWriterTemplate data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />}
                            {!['academic-latex', 'marketer-gold-timeline', 'hybrid-ats-premium', 'silicon-valley-tech', 'modern-pro', 'designer-black-sidebar', 'executive-grid', 'medical-care-professional', 'minimal-swiss', 'textured-slate-serif', 'technical-elite', 'creative-pastel-frame', 'creative-min', 'asymmetrical-writer', 'classic-ats'].includes(selectedTemplate) && (
                              <DynamicTemplate id={selectedTemplate} data={editedProfile || profile} summary={summary} photo={(editedProfile || profile)?.profile_photo_url} />
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>

      <ConsentModal
        isOpen={consentOpen}
        title="Resume Processing Consent"
        subtitle="AI Optimization & PDF Generation Parameters"
        consentMessage="To leverage our automated AI Resume Optimizer, you consent to the storage, profile-parsing, and transformation of your registered skills, academic records, and technical experiences. Gemini Large Language models will process this information securely server-side to align, re-phrase, and optimize keywords based on standard placement ATS parameters."
        compulsoryWarning="Declining this consent will prevent you from utilizing our automatic AI Resume Optimizer. AI-enabled profiling data is compulsory to match corporate ATS screening metrics."
        onAgree={() => {
          localStorage.setItem("consent_resume", "true");
          setConsentOpen(false);
        }}
        onDisagreeClose={() => {
          navigate("/student");
        }}
      />
    </div>
  );
}

function StepBadge({ active, done, label, icon }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
       <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-200 text-slate-400'}`}>
          {done ? <CheckCircle size={14} /> : icon}
       </div>
       <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
