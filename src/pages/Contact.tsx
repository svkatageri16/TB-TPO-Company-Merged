import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  SendHorizontal, 
  ChevronDown, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQAccordionItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-indigo-100 transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
      >
        <span className="text-sm shrink-0 flex items-center gap-3">
          <HelpCircle size={16} className="text-indigo-500" />
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-slate-400 shrink-0"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold border-t border-slate-50/50 bg-slate-50/50">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setSending(true);
    // Simulate real-world secure network dispatch
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast.success("Message secure dispatched!");
    }, 1500);
  };

  const resetForm = () => {
    setForm({ name: "", email: "", subject: "", message: "" });
    setSent(false);
  };

  const faqs = [
    {
      question: "Is VEGA free for students?",
      answer: "Yes, VEGA is completely free for all verified students looking for work! You get access to resume checkers, practice screens, and career matching."
    },
    {
      question: "How do I claim support for XP balances?",
      answer: "XP updates instantly upon performing events (daily check-ins, simulated mock interviews, store trades). If you note any latency, feel free to use this form to reach out."
    },
    {
      question: "Can colleges track their placement rate?",
      answer: "Absolutely! We support Custom Academic audits. Reach out to our team here using the form, and we can onboard your university administrative dashboard."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#fafbff] selection:bg-indigo-100 selection:text-indigo-900 pb-24 pt-28 overflow-hidden font-sans">
      
      {/* Immersive Aero Ambient Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 right-[-10%] w-[800px] h-[500px] bg-gradient-to-b from-indigo-300/10 via-purple-300/10 to-transparent blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[500px] bg-emerald-300/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_80%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-6"
          >
            <Sparkles size={14} className="text-indigo-600 animate-[spin_4s_linear_infinite]" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-700">Unified Help Desk</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4"
          >
            Let's Start a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-500">Conversation</span>.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base sm:text-lg text-slate-500 leading-relaxed font-semibold max-w-xl mx-auto"
          >
            Our dedicated support engineers operate 24x7 to ensure uninterrupted matching pipelines and student coaching.
          </motion.p>
        </div>

        {/* TWO COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: Channels & FAQs Accordion */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Quick Contact Points */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: Mail, label: "Email Support", info: "support@vega.com", desc: "Response within 4 hours", color: "text-indigo-600 bg-indigo-50" },
                { icon: Phone, label: "Call Helpline", info: "+91 98765 43210", desc: "Mon-Sat: 9 AM - 6 PM IST", color: "text-emerald-600 bg-emerald-50" },
                { icon: MapPin, label: "Corporate Office", info: "Silicon Valley, CA & Pune Regional Center", desc: "Innovation Campus hubs", color: "text-purple-600 bg-purple-50" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="p-5 rounded-2xl bg-white border border-slate-100 flex items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:border-indigo-100 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</h3>
                    <p className="text-sm font-extrabold text-slate-800 mb-0.5">{item.info}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Response Promise */}
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative overflow-hidden shadow-lg border border-slate-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full" />
              <div className="flex items-center gap-3 mb-3">
                <Clock size={18} className="text-indigo-300" />
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">Response Promise</h4>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-indigo-100/70 font-semibold mb-1">
                Candidate application/XP inquiries are audited and addressed within <strong>2 hours</strong>.
              </p>
              <p className="text-[11px] text-indigo-200/50">Urgent institutional onboarding tickets get immediate Tier-1 engineer assignments.</p>
            </div>

            {/* Interactive FAQs Accordion */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight px-1">Frequent Inquiries</h3>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <FAQAccordionItem key={idx} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Contact Dispatcher Form */}
          <div className="lg:col-span-7">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.025)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 blur-3xl rounded-full" />
              
              <AnimatePresence mode="wait">
                {!sent ? (
                  <motion.div
                    key="contact-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Direct Support Dispatcher</h2>
                      <p className="text-slate-500 text-xs font-semibold mt-1">Submit your transaction or interface concerns directly to engineering.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Name *</label>
                          <input
                            required
                            type="text"
                            placeholder="Your name"
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-150 focus:border-indigo-500 focus:outline-none transition-all font-semibold text-slate-800 placeholder-slate-400 text-sm focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Email *</label>
                          <input
                            required
                            type="email"
                            placeholder="Your email address"
                            value={form.email}
                            onChange={e => setForm({...form, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-150 focus:border-indigo-500 focus:outline-none transition-all font-semibold text-slate-800 placeholder-slate-400 text-sm focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Subject / Category</label>
                        <input
                          type="text"
                          placeholder="Subject of message"
                          value={form.subject}
                          onChange={e => setForm({...form, subject: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-150 focus:border-indigo-500 focus:outline-none transition-all font-semibold text-slate-800 placeholder-slate-400 text-sm focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Detailed Message *</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Please describe your support requirement or query..."
                          value={form.message}
                          onChange={e => setForm({...form, message: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-150 focus:border-indigo-500 focus:outline-none transition-all font-semibold text-slate-800 placeholder-slate-400 text-sm focus:ring-4 focus:ring-indigo-100 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-4 px-6 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 hover:-translate-y-0.5 hover:scale-[1.01] shadow-[0_10px_20px_rgba(0,0,0,0.05)] disabled:opacity-50 cursor-pointer"
                      >
                        {sending ? (
                          <>
                            <span className="w-5 h-5 rounded-full border-2 border-white/35 border-t-white animate-spin shrink-0" />
                            <span>Transmitting Securely...</span>
                          </>
                        ) : (
                          <>
                            <span>Dispatch Secure Message</span>
                            <SendHorizontal size={16} />
                          </>
                        )}
                      </button>

                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success-receipt"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-10 flex flex-col items-center gap-6"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
                    >
                      <CheckCircle2 size={36} />
                    </motion.div>
                    
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dispatched Successfully!</h2>
                      <p className="text-slate-500 text-sm font-semibold mt-2 max-w-sm mx-auto">
                        Your secure message has bypassed physical queues. Our support coordinators are on it.
                      </p>
                    </div>

                    <div className="w-full max-w-sm border border-dashed border-slate-200 rounded-2xl p-5 text-left bg-slate-50 font-mono text-[11px] text-slate-600 space-y-2 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold border-b border-slate-100 pb-2 mb-2">
                        <FileText size={14} className="text-indigo-500" />
                        <span>RECEIPT METADATA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TRANSMITTER:</span>
                        <span className="font-bold text-slate-800">{form.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DESTINATION:</span>
                        <span className="font-bold text-indigo-600">Unified Help Desk</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PRIORITY ROUTING:</span>
                        <span className="font-black text-emerald-600">COMPLIANCE HIGH</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span>STATUS:</span>
                        <span className="font-bold text-slate-800 animate-pulse">● ROUTING SECURE</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="mt-6 px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Transmit new inquiry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

