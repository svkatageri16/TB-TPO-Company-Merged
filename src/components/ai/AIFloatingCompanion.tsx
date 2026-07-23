import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, X, Send, Mic, Sparkles, Navigation, ListTodo, Briefcase, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

interface Message {
  role: 'USER' | 'AI';
  text: string;
}

export function AIFloatingCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && isOpen) {
      loadHistory();
    }
  }, [user?.id, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMsg(transcript);
        sendMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/chatbot/history');
      if (data.history) {
        setMessages(data.history.map((m: any) => ({ role: m.role, text: m.message })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const processResponseControls = (text: string) => {
    let rawText = text;
    const match = rawText.match(/\[ACTION:NAVIGATE:(.*?)\]/);
    if (match) {
      const path = match[1];
      rawText = rawText.replace(match[0], "").trim();
      setTimeout(() => navigate(path.trim()), 1500); // Wait 1.5s then navigate
    }
    return rawText;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const currentMsg = text.trim();
    setInputMsg("");
    setMessages(prev => [...prev, { role: 'USER', text: currentMsg }]);
    setIsTyping(true);

    try {
      const authData = localStorage.getItem('vega_auth');
      let token = '';
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          token = parsed.token || '';
        } catch(e) {}
      }
      
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: currentMsg, 
          platformContext: location.pathname 
        }),
      });

      if (!response.ok) {
        let errStr = "Failed to communicate with AI.";
        try {
          const errData = await response.json();
          errStr = errData.message || errData.error || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }
      if (!response.body) throw new Error("No response string");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages(prev => [...prev, { role: 'AI', text: "" }]);

      let doneReading = false;
      let fullAiText = "";
      
      while (!doneReading) {
        const { value, done } = await reader.read();
        if (done) {
          doneReading = true;
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.text) {
                fullAiText += dataObj.text;
                // Safely update the last message
                setMessages(prev => {
                  const arr = [...prev];
                  arr[arr.length - 1].text = fullAiText;
                  return arr;
                });
              }
            } catch (err) {}
          }
        }
      }
      setIsTyping(false);
      
      // Post-process the final text for actions
      const cleanedMessage = processResponseControls(fullAiText);
      if (cleanedMessage !== fullAiText) {
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1].text = cleanedMessage;
          return arr;
        });
      }

    } catch (e: any) {
      console.error(e);
      setMessages(prev => {
        const arr = [...prev];
        if (arr.length > 0 && arr[arr.length - 1].role === 'AI' && arr[arr.length - 1].text === "") {
          arr[arr.length - 1].text = "⚠️ " + (e.message || "Something went wrong.");
        } else {
          arr.push({ role: 'AI', text: "⚠️ " + (e.message || "Something went wrong.") });
        }
        return arr;
      });
      setIsTyping(false);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const quickActions = [
    { label: "Improve Resume", icon: <FileText size={14}/>, command: "Can you review my resume and suggest improvements?" },
    { label: "Mock Interview", icon: <Briefcase size={14}/>, command: "Start an AI mock interview for my role." },
    { label: "Find Jobs", icon: <Navigation size={14}/>, command: "Show me jobs that match my current skills." }
  ];

  if (!user) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
            className="absolute bottom-20 right-0 w-[380px] h-[550px] flex flex-col glass-card overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.15)] border-white/60 bg-white/95 rounded-3xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg shadow-slate-200">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">VEGA AI</h4>
                  <p className="text-sm font-bold text-slate-900 tracking-tight leading-none mt-0.5">
                    Career Assistant
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                     <Sparkles size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">How can I help you today?</h3>
                    <p className="text-xs text-slate-500 mt-1">Ask me about jobs, interviews, or your resume.</p>
                  </div>
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 text-sm rounded-2xl ${m.role === 'USER' ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                    {/* Render message with line breaks */}
                    {m.text.split('\n').map((line, j) => (
                      <React.Fragment key={j}>
                        {line}
                        <br/>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-4 bg-white border border-slate-200 text-emerald-500 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                     <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                     <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
              {messages.length < 3 && (
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                  {quickActions.map((action, i) => (
                    <button 
                      key={i}
                      onClick={() => sendMessage(action.command)}
                      className="whitespace-nowrap px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors"
                    >
                      {action.icon} {action.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleListen}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Mic size={18} />
                </button>
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputMsg)}
                  placeholder="Ask anything about your career..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
                <button 
                  onClick={() => sendMessage(inputMsg)}
                  disabled={!inputMsg.trim() || isTyping}
                  className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 transition-all duration-500 relative ${isOpen ? 'bg-slate-900 rotate-90 scale-90' : 'bg-emerald-500'}`}
      >
        {isOpen ? <X size={28} /> : (
          <>
            <BrainCircuit size={32} className="animate-float" />
          </>
        )}
      </motion.button>
    </div>
  );
}

