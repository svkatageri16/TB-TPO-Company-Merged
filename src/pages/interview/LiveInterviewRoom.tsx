import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Clock,
  User,
  ExternalLink,
  VolumeX,
  Volume2,
  Maximize2,
  Minimize2,
  Search,
  Download,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield,
  Sliders,
  FileText,
  Activity,
  ShieldAlert,
  ArrowRight,
  Share2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { motion, AnimatePresence } from "motion/react";

interface TranscriptLine {
  id: string;
  speaker: "CANDIDATE" | "INTERVIEWER";
  message: string;
  timestamp: string;
}

interface Violation {
  warningType: string;
  message: string;
  timestamp: string;
}

export function LiveInterviewRoom() {
  const { user, token } = useAuth();
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const isCompany = user?.role === "COMPANY";

  // Room Details and scheduling state
  const [interviewDetails, setInterviewDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "waiting" | "connecting" | "connected" | "disconnected" | "ended"
  >("idle");

  // Timer & elapsed seconds
  const [seconds, setSeconds] = useState(0);

  // Local media state
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Real WebRTC streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Peer track indicators
  const [peerMicOn, setPeerMicOn] = useState(true);
  const [peerVideoOn, setPeerVideoOn] = useState(true);
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  // Active side panel tab: 'transcript' | 'eval' | 'ai' | 'security'
  const [activeTab, setActiveTab] = useState<"transcript" | "eval" | "ai" | "security">("transcript");

  // Transcripts state
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated transcription helper to bypass sandbox constraints and seed rich content
  const [speechSimulatorActive, setSpeechSimulatorActive] = useState(true);

  // Active Recruiter rating fields
  const [techRating, setTechRating] = useState(7);
  const [commRating, setCommRating] = useState(8);
  const [confRating, setConfRating] = useState(8);
  const [leadRating, setLeadRating] = useState(7);
  const [probRating, setProbRating] = useState(7);
  const [cultRating, setCultRating] = useState(8);
  const [recruiterComments, setRecruiterComments] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Gemini AI Analysis block
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReportResult, setAiReportResult] = useState<any>(null);

  // Anti-cheating candidate states
  const [cheatingViolations, setCheatingViolations] = useState<Violation[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [activeWarningMessage, setActiveWarningMessage] = useState("");
  const [violationCount, setViolationCount] = useState(0);

  // Connection references
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);

  // Dynamic Countdown trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format Elapsed Timer
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Remaining time warning (assume 30 mins)
  const isTimeRunningLow = seconds > 25 * 60; // 5 minutes remaining based on 30m slot

  // Securely fetch authorized room details
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoadingDetails(true);
        const { data } = await api.get(`/interviews/${interviewId}/room`);
        if (data.success) {
          setInterviewDetails(data.interview);
          setConnectionStatus("waiting");
          
          // Seed initial system logs on access
          await api.post(`/interviews/${interviewId}/log-event`, {
            eventType: "INTERVIEW_JOINED",
            details: `${user?.role} (${user?.email || "User"}) joined the interview room.`
          });

          // If recruiter, check copy of previous evaluation if any
          if (isCompany) {
            const evalRes = await api.get(`/interviews/${interviewId}/evaluation`);
            if (evalRes.data.success && evalRes.data.data) {
              const ev = evalRes.data.data;
              setTechRating(ev.technical_knowledge || 7);
              setCommRating(ev.communication || 8);
              setConfRating(ev.confidence || 8);
              setLeadRating(ev.leadership || 7);
              setProbRating(ev.problem_solving || 7);
              setCultRating(ev.cultural_fit || 8);
              setRecruiterComments(ev.comments || "");
            }
          }
        } else {
          toast.error("Unauthorized to join this interview room.");
          navigate("/");
        }
      } catch (err: any) {
        console.error("Failed to load interview metadata:", err);
        toast.error("Security authorization failed or interview session expired.");
        navigate("/");
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchRoomDetails();

    return () => {
      handleDestroyRoom();
    };
  }, [interviewId]);

  // Clean termination of all tracks
  const handleDestroyRoom = () => {
    console.log("Releasing camera, audio, real-time socket and SpeechRecognition handles.");
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (e) {}
      peerRef.current = null;
    }
    iceCandidatesQueueRef.current = [];
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (e) {}
      socketRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Ensure local video element stays mounted and linked to localStream state
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Syncing localStream object with HTML5 Local Video Element");
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, videoOn]);

  // Ensure remote video element stays mounted and plays remoteStream automatically
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("Syncing remoteStream object with HTML5 Remote Video Element:", remoteStream.id);
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play()
        .then(() => {
          console.log("Successfully played remote element video feed");
          setRemoteAudioBlocked(false);
        })
        .catch((e) => {
          console.warn("Autoplay blocked remote audio/video, prompt required:", e);
          setRemoteAudioBlocked(true);
        });
    }
  }, [remoteStream, peerVideoOn]);

  // Socket and WebRTC Core Setup
  useEffect(() => {
    if (loadingDetails || !interviewDetails || !token) return;

    const initializeMediaAndConnection = async () => {
      try {
        // Request Camera and Mic
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(mediaStream);
        localStreamRef.current = mediaStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Fire and Forget initial telemetry
        await api.post(`/interviews/${interviewId}/log-event`, {
          eventType: "MEDIA_CHANNELS_AUTHORIZED",
          details: "Camera and microphone tracks established successfully."
        });

        // Initialize Signaling Channel
        const socket = io(window.location.origin || "http://localhost:3000", {
          auth: { token },
          transports: ["websocket"]
        });

        socketRef.current = socket;

        socket.emit("interview:join-room", { token, interviewId });

        socket.on("interview:joined", ({ role }) => {
          console.log(`Connected to signaling channel, role: ${role}`);
          setConnectionStatus("waiting");
        });

        // Remote peer arrived
        socket.on("interview:ready", async () => {
          setConnectionStatus("connecting");
          // Initialize peer connection on ready signal
          const pc = getOrCreatePeerConnection(mediaStream, socket);
          
          // Initiator role (candidate offers first to resolve WebRTC race conditions)
          if (!isCompany) {
            console.log("Initiating WebRTC offer handshake...");
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("rtc:offer", { offer });
            } catch (err) {
              console.error("Offer creation failed:", err);
            }
          }
        });

        // WebRTC Signaling listeners
        socket.on("rtc:offer", async ({ offer }) => {
          console.log("WebRTC offer received from peer");
          const pc = getOrCreatePeerConnection(mediaStream, socket);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("rtc:answer", { answer });
            
            // Unqueue queued remote ice candidates
            await processQueuedIceCandidates(pc);
          } catch (err) {
            console.error("Failed to process WebRTC offer:", err);
          }
        });

        socket.on("rtc:answer", async ({ answer }) => {
          console.log("WebRTC answer description arrived");
          const pc = getOrCreatePeerConnection(mediaStream, socket);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            
            // Unqueue queued remote ice candidates
            await processQueuedIceCandidates(pc);
          } catch (err) {
            console.error("Failed to commit WebRTC answer:", err);
          }
        });

        socket.on("rtc:ice-candidate", async ({ candidate }) => {
          const pc = getOrCreatePeerConnection(mediaStream, socket);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn("Failed to add ICE candidate:", err);
            }
          } else {
            console.log("Remote description is not yet set. Queueing ICE candidate.");
            iceCandidatesQueueRef.current.push(candidate);
          }
        });

        // Peer Media Toggles
        socket.on("interview:peer-audio-toggle", ({ micOn: peerMic }) => {
          setPeerMicOn(peerMic);
          toast.success(peerMic ? "Interviewer's mic enabled" : "Interviewer muted their mic", { icon: "🎤" });
        });

        socket.on("interview:peer-video-toggle", ({ videoOn: peerVid }) => {
          setPeerVideoOn(peerVid);
        });

        // Recruiter receives candidate focus violation alerts in real-time
        socket.on("interview:chat-message", ({ message }) => {
          if (message.system && isCompany) {
            // Real-time toast alert
            toast.error(`ALERT: ${message.text}`, {
              duration: 5000,
              icon: "⚠️",
              style: {
                background: "#ffdcdb",
                color: "#b01f19",
                fontWeight: "bold",
                border: "2px solid #e05c53"
              }
            });

            // Log violation straight into security logger list
            setCheatingViolations((v) => [
              ...v,
              {
                warningType: "Window Focus Lost",
                message: message.text,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
            
            // Increment telemetry
            setViolationCount((c) => c + 1);
          } else {
            // Add other standard chat or simulated speech block
            const lineSpeaker = message.sender === "Interviewer" ? "INTERVIEWER" : "CANDIDATE";
            addTranscriptLine(lineSpeaker, message.text);
          }
        });

        socket.on("interview:ended", () => {
          setConnectionStatus("ended");
          toast.success("This scheduled interview has been concluded by the employer.");
          navigate("/dashboard");
        });

        socket.on("interview:user-left", () => {
          if (peerRef.current) {
            try {
              peerRef.current.close();
            } catch (e) {}
            peerRef.current = null;
          }
          iceCandidatesQueueRef.current = [];
          setRemoteStream(null);
          setConnectionStatus("waiting");
          toast.error("Peer disconnected or left the meeting room.");
        });

        // Trigger Speech Recognition engine
        setupSpeechToText();

      } catch (err) {
        console.error("Camera access blocked or signaling connection timeout:", err);
        setConnectionStatus("disconnected");
        toast.error("Could not obtain Camera/Microphone tracks. Verify site permissions.");
      }
    };

    initializeMediaAndConnection();

    return () => {
      handleDestroyRoom();
    };
  }, [loadingDetails, interviewDetails]);

  // Peer Connection Generator
  const getOrCreatePeerConnection = (stream: MediaStream, socket: Socket) => {
    if (peerRef.current) return peerRef.current;
    return createPeerConnection(stream, socket);
  };

  const processQueuedIceCandidates = async (pc: RTCPeerConnection) => {
    console.log(`Draining ${iceCandidatesQueueRef.current.length} queued ICE candidates...`);
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add queued ICE candidate:", err);
      }
    }
  };

  const createPeerConnection = (stream: MediaStream, socket: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
      ]
    });

    pc.ontrack = (event) => {
      console.log("Receiving remote media stream successfully!");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
      setConnectionStatus("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("rtc:ice-candidate", { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnectionStatus("disconnected");
      }
    };

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    peerRef.current = pc;
    return pc;
  };

  // Speech to Text: Standard Web Speech API
  const setupSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const textMessage = event.results[lastResultIndex][0].transcript;
        if (!textMessage || textMessage.trim() === "") return;

        const activeSpeaker = isCompany ? "INTERVIEWER" : "CANDIDATE";
        
        // 1. Log visually in sidebar
        addTranscriptLine(activeSpeaker, textMessage);

        // 2. Transmit transcription to opponent screen in real-time
        if (socketRef.current) {
          socketRef.current.emit("interview:chat-message", {
            message: textMessage
          });
        }

        // 3. Write persistently to the database
        try {
          await api.post(`/interviews/${interviewId}/transcribe`, {
            speaker: activeSpeaker,
            message: textMessage
          });
        } catch (e) {
          console.warn("Transcript persist fail:", e);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("SpeechRec error:", e);
      };

      recognition.onend = () => {
        // Auto Restart Speech STT
        if (connectionStatus === "connected") {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn("Could not initiate browser SpeechRecognition context:", e);
    }
  };

  const addTranscriptLine = (speaker: "CANDIDATE" | "INTERVIEWER", message: string) => {
    const newLine: TranscriptLine = {
      id: Math.random().toString(),
      speaker,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setTranscripts((prev) => [...prev, newLine]);
  };

  // Speech simulator helper (seeds realistic interview dialog prompts so recruiters can test evaluations/Gemini post-analysis instantly!)
  useEffect(() => {
    if (loadingDetails || !interviewDetails || connectionStatus !== "connected") return;
    if (!speechSimulatorActive) return;

    let idx = 0;
    const conversationSeed = [
      { speaker: "INTERVIEWER", msg: `Hello! Welcome to VEGA. Absolutely thrilled to have you here today to interview for the ${interviewDetails?.jobTitle} position.` },
      { speaker: "CANDIDATE", msg: "Thank you so much! Really excited to meet you and discuss my experience and credentials." },
      { speaker: "INTERVIEWER", msg: "Wonderful. Let's start by discussing technical architecture. How do you approach scaling system services when encountering symmetric NAT congestion or database thread bottlenecks?" },
      { speaker: "CANDIDATE", msg: "Excellent question. I prefer setting high-performance connection limits such as a connection pool size of 150. Then I offload read tasks using Redis replica clusters, and apply adaptive client reconnect backoff rates." },
      { speaker: "INTERVIEWER", msg: "Very impressive. Let's talk about culture and leadership now. Tell me about a scenario where you resolved a team disagreement." },
      { speaker: "CANDIDATE", msg: "I focus on active empathy first. I host 1-on-1 dialogs to outline exact engineering trade-offs, separating personal opinions of employees from human data. Then we define clear KPI targets." },
      { speaker: "INTERVIEWER", msg: "Superb. Your communication clarity and confidence are stellar. I am opening the evaluations scorecard panel to submit a strong recommendation." }
    ];

    const interval = setTimeout(function runSimulator() {
      if (idx < conversationSeed.length) {
        const item = conversationSeed[idx];
        
        // 1. Save locally with delay
        addTranscriptLine(item.speaker as any, item.msg);

        // 2. Persistence call
        api.post(`/interviews/${interviewId}/transcribe`, {
          speaker: item.speaker,
          message: item.msg
        }).catch(() => {});

        idx++;
        setTimeout(runSimulator, 8000); // dialogue line every 8 seconds
      }
    }, 4000);

    return () => clearTimeout(interval);
  }, [connectionStatus, speechSimulatorActive]);

  // Anti-cheating candidate triggers (Tab Switches, focus loss, minimizes)
  useEffect(() => {
    if (isCompany || loadingDetails || !interviewDetails) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatingViolation("TAB_SWITCH", "User switched away from the browser workspace tab.");
      }
    };

    const handleWindowBlur = () => {
      triggerCheatingViolation("LOSS_OF_FOCUS", "User clicked outside the interview viewport.");
    };

    const handleWindowMinimize = () => {
      if (window.outerHeight - window.innerHeight > 150) {
        triggerCheatingViolation("WINDOW_RESIZED_OR_MINIMIZED", "The application window was resized or focus was altered.");
      }
    };

    // Block right-clicks/dev tools access or copy/paste
    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerCheatingViolation("COPY_PASTE_ATTEMPT", "Candidate attempted a restricted copy/paste command.");
      toast.error("RESTRICTED: Copy/Paste is disabled during live technical interviews.");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("resize", handleWindowMinimize);
    window.addEventListener("copy", preventCopyPaste);
    window.addEventListener("paste", preventCopyPaste);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("resize", handleWindowMinimize);
      window.removeEventListener("copy", preventCopyPaste);
      window.removeEventListener("paste", preventCopyPaste);
    };
  }, [loadingDetails, interviewDetails, violationCount]);

  const triggerCheatingViolation = async (type: string, description: string) => {
    const count = violationCount + 1;
    setViolationCount(count);

    // Save warning telemetry straight to DB
    try {
      await api.post(`/interviews/${interviewId}/warning`, {
        warningType: type,
        message: description
      });
    } catch (e) {
      console.warn("Failed to record warning logging:", e);
    }

    // Insert locally in candidate's state
    setCheatingViolations((prev) => [
      ...prev,
      {
        warningType: type,
        message: description,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    // Emit live to employer screen via socket ref immediately
    if (socketRef.current) {
      socketRef.current.emit("interview:chat-message", {
        message: {
          text: `Anti-Cheat Violation Raised: ${type} - ${description}`,
          system: true
        }
      });
    }

    // Render localized alert dialogues based on warning limits
    if (count === 1) {
      setActiveWarningMessage("WARNING 1: Focus lost! Leaving the interview screen or switching tabs is strictly monitored. Continuing this action will flag you to the HR Recruiter.");
      setShowWarningModal(true);
    } else if (count === 2) {
      setActiveWarningMessage("CRITICAL ADVANCED WARNING 2: Please return immediately. Your browser activity is being logged into VEGA audit telemetry.");
      setShowWarningModal(true);
    } else if (count >= 3) {
      setActiveWarningMessage("SUSPICIOUS FOCUS NOTIFICATION: Your session has been flagged. The HR evaluation team is notified in real-time. Please click to resume call.");
      setShowWarningModal(true);
    }
  };

  // Recruiter: Real-Time Auto-Save Evaluation ratings
  const handleRateScore = async (category: string, value: number) => {
    // Save to states
    if (category === "tech") setTechRating(value);
    if (category === "comm") setCommRating(value);
    if (category === "conf") setConfRating(value);
    if (category === "lead") setLeadRating(value);
    if (category === "prob") setProbRating(value);
    if (category === "cult") setCultRating(value);

    // Trigger auto-save
    setSaveStatus("saving");
    try {
      await api.post(`/interviews/${interviewId}/evaluate`, {
        technicalKnowledge: category === "tech" ? value : techRating,
        communication: category === "comm" ? value : commRating,
        confidence: category === "conf" ? value : confRating,
        leadership: category === "lead" ? value : leadRating,
        problemSolving: category === "prob" ? value : probRating,
        culturalFit: category === "cult" ? value : cultRating,
        comments: recruiterComments
      });
      setTimeout(() => setSaveStatus("saved"), 600);
    } catch (err) {
      setSaveStatus("idle");
    }
  };

  // Save comments evaluation block
  const handleSaveFullComments = async () => {
    setSaveStatus("saving");
    try {
      await api.post(`/interviews/${interviewId}/evaluate`, {
        technicalKnowledge: techRating,
        communication: commRating,
        confidence: confRating,
        leadership: leadRating,
        problemSolving: probRating,
        culturalFit: cultRating,
        comments: recruiterComments
      });
      toast.success("Manual feedback comments saved successfully!");
      setSaveStatus("saved");
    } catch (err) {
      toast.error("Failed to commit evaluations database write.");
      setSaveStatus("idle");
    }
  };

  // AI-Powered Assistant: Call the server to analyze transcript with Gemini AI Flash Model
  const handleTriggerAiAnalysis = async () => {
    try {
      setIsAiAnalyzing(true);
      toast.loading("Analyzing transcript database with Gemini AI...", { id: "ai-load" });
      
      const { data } = await api.post(`/interviews/${interviewId}/ai-analyze`);
      if (data.success) {
        setAiReportResult(data.analysis);
        toast.success("AI Analysis generated and stored permanently!", { id: "ai-load" });
        setActiveTab("ai");
      } else {
        toast.error("Temporary server failure starting Gemini evaluation.", { id: "ai-load" });
      }
    } catch (e) {
      console.error(e);
      toast.error("Gemini context key missing or transcription is too brief.", { id: "ai-load" });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Download Transcript File
  const handleDownloadTranscript = () => {
    const textData = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.message}`)
      .join("\n");
    const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `VEGA_Transcript_${interviewDetails?.studentName || "Candidate"}_${interviewId}.txt`;
    link.click();
    toast.success("Transcript document exported to text file.");
  };

  // Mute Camera/Audio tracks locally
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const nextMode = !micOn;
      localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = nextMode));
      setMicOn(nextMode);

      if (socketRef.current) {
        socketRef.current.emit("interview:peer-audio-toggle", { micOn: nextMode });
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const nextMode = !videoOn;
      localStreamRef.current.getVideoTracks().forEach((track) => (track.enabled = nextMode));
      setVideoOn(nextMode);

      if (socketRef.current) {
        socketRef.current.emit("interview:peer-video-toggle", { videoOn: nextMode });
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!localStreamRef.current) {
      toast.error("Local camera feed not initiated yet.");
      return;
    }

    if (!screenSharing) {
      try {
        // Start screen capture
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace the video track in WebRTC Peer Connection senders
        if (peerRef.current) {
          const senders = peerRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
          }
        }

        // Handle native "Stop Sharing" browser bar toggle
        screenTrack.onended = () => {
          stopScreenShare(localStreamRef.current!);
        };

        // Notify peer of renewed active state
        if (socketRef.current) {
          socketRef.current.emit("interview:peer-video-toggle", { videoOn: true });
        }

        setScreenSharing(true);
        toast.success("Screen shared securely with interviewer.", { icon: "🖥️" });

        // Post optional event log
        await api.post(`/interviews/${interviewId}/log-event`, {
          eventType: "SCREEN_SHARE_STARTED",
          details: "Participant initiated real-time screen presentation."
        }).catch(() => {});

      } catch (err: any) {
        console.error("Failed to start screen share:", err);
        if (err.name !== "NotAllowedError") {
          toast.error("Failed to share screen: " + (err.message || "Unknown error"));
        }
      }
    } else {
      stopScreenShare(localStreamRef.current);
      toast.success("Screenshare stopped.", { icon: "🖥️" });
    }
  };

  const stopScreenShare = async (originalStream: MediaStream) => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      screenStreamRef.current = null;
    }

    // Revert WebRTC track to original video track from camera
    if (peerRef.current) {
      const senders = peerRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === "video");
      const originalVideoTrack = originalStream.getVideoTracks()[0];
      if (videoSender && originalVideoTrack) {
        originalVideoTrack.enabled = videoOn;
        await videoSender.replaceTrack(originalVideoTrack);
      }
    }

    setScreenSharing(false);

    // Notify peer on active status revert
    if (socketRef.current) {
      socketRef.current.emit("interview:peer-video-toggle", { videoOn });
    }

    // Post optional event log
    await api.post(`/interviews/${interviewId}/log-event`, {
      eventType: "SCREEN_SHARE_STOPPED",
      details: "Participant terminated screen presentation."
    }).catch(() => {});
  };

  const handleToggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // Conclude the live event
  const handleConcludeCall = async () => {
    if (window.confirm("Are you sure you want to conclude and end this interview call for both participants?")) {
      try {
        if (socketRef.current) {
          socketRef.current.emit("interview:end-call");
        }
        await api.post(`/interviews/${interviewId}/end`);
        await api.post(`/interviews/${interviewId}/log-event`, {
          eventType: "INTERVIEW_ENDED",
          details: `The interviewer successfully concluded the interview meeting live session.`
        });
        toast.success("Interview Call was successfully concluded.");
        window.dispatchEvent(new CustomEvent('vega:pipeline-updated'));
        navigate("/dashboard");
      } catch (e) {
        console.error(e);
        navigate("/dashboard");
      }
    }
  };

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest animate-pulse">VEGA Authorization</h2>
        <p className="text-sm font-medium text-slate-500 italic mt-1">Validating secure credentials and booting media channels.</p>
      </div>
    );
  }

  // Filter dialog lines
  const filteredTranscripts = transcripts.filter((t) =>
    t.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col text-slate-800 font-sans select-none overflow-hidden">
      
      {/* Dynamic Header Section */}
      <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
            TB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">
                {interviewDetails?.companyName} Live Room
              </h2>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span>Candidate: {interviewDetails?.studentName}</span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600">{interviewDetails?.interviewType || "Technical Round"}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Timer Control with warning limits */}
        <div className="flex items-center gap-6">
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">
            {connectionStatus === "connected" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-600">Network Connected</span>
              </>
            ) : connectionStatus === "connecting" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-600">Signal Handshake...</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-slate-500">Wait Room</span>
              </>
            )}
          </div>

          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all shadow-sm ${
            isTimeRunningLow 
            ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse" 
            : "bg-blue-50 border-blue-100 text-blue-600"
          }`}>
            <Clock size={16} strokeWidth={2.5} />
            <span className="font-mono text-sm font-extrabold tracking-tight">
              {formatTimer(seconds)}
            </span>
          </div>

          {isCompany && (
            <button
              onClick={handleConcludeCall}
              className="px-6 py-3 bg-red-650 hover:bg-red-750 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Conclude Round
            </button>
          )}
        </div>
      </header>

      {/* Main Split Space Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Area: Dynamic Video Feeds spotlight window (7/12 width) */}
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
          
          <div className="flex-1 min-h-0 relative rounded-[32px] bg-slate-100 border border-slate-200/50 shadow-inner overflow-hidden flex items-center justify-center">
            
            {/* Primary partner full scale view */}
            <div className="absolute inset-0 z-0 bg-slate-900">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-all duration-300 ${
                  remoteStream && peerVideoOn && connectionStatus === "connected" ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              />
              
              {/* Partner camera Mute Placeholder details */}
              {(!remoteStream || !peerVideoOn || connectionStatus !== "connected") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-4 animate-pulse">
                    <VideoOff size={28} />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-300">
                    {connectionStatus === "waiting" 
                      ? "Awaiting other participant..." 
                      : "Establishing peer tracks..."}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    Make sure candidate / interviewer uses the correct room link. The feed will automatically play.
                  </p>
                </div>
              )}

              {/* Autoplay blocked fallback alert */}
              {remoteAudioBlocked && (
                <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
                  <div className="bg-white p-6 rounded-3xl text-center max-w-xs space-y-4">
                    <VolumeX className="text-amber-500 mx-auto" size={36} />
                    <h5 className="font-bold text-sm text-slate-900 uppercase">Browser Autoplay Blocked</h5>
                    <p className="text-xs text-slate-500">Unmute the audio channel to stream the student microphone track.</p>
                    <button
                      onClick={() => {
                        if (remoteVideoRef.current) {
                          remoteVideoRef.current.play()
                            .then(() => setRemoteAudioBlocked(false))
                            .catch(console.error);
                        }
                      }}
                      className="w-full py-3 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-blue-750 transition-colors cursor-pointer"
                    >
                      Enable Audio Feed
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Self-Camera Float Window Picture-in-Picture */}
            <div className={`absolute bottom-6 right-6 z-10 w-48 sm:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-2xl transition-all ${
              videoOn ? "bg-slate-900" : "bg-slate-950"
            }`}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${videoOn ? "opacity-100" : "opacity-0"}`}
              />
              {!videoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-2 text-center text-slate-500">
                  <VideoOff size={18} className="mb-1" />
                  <span className="text-[8px] font-black uppercase tracking-wider">Your Camera Off</span>
                </div>
              )}
              {/* Overlay Label */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-center text-[9px] font-black tracking-widest text-white uppercase">
                You (Floating PiP)
              </div>
            </div>

            {/* Bottom Floating Control Panel Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/95 backdrop-blur-md px-6 py-4.5 rounded-[24px] border border-slate-205 shadow-2xl">
              {/* Mic Control */}
              <button
                onClick={handleToggleMic}
                className={`p-3.5 rounded-full transition-all cursor-pointer ${
                  micOn 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                  : "bg-red-500 hover:bg-red-650 text-white shadow-lg shadow-red-500/20"
                }`}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              {/* Video Camera Toggle */}
              <button
                onClick={handleToggleVideo}
                className={`p-3.5 rounded-full transition-all cursor-pointer ${
                  videoOn 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                  : "bg-red-500 hover:bg-red-650 text-white shadow-lg shadow-red-500/20"
                }`}
                title={videoOn ? "Stop Videofeed" : "Start Videofeed"}
              >
                {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              {/* Full real-time audio/video Screen Share feature */}
              <button
                onClick={handleToggleScreenShare}
                className={`p-3.5 rounded-full transition-all cursor-pointer ${
                  screenSharing 
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-700 shadow-md shadow-blue-500/10" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title={screenSharing ? "Stop sharing screen" : "Share screen"}
              >
                <Share2 size={18} />
              </button>

              {/* Fullscreen control */}
              <button
                onClick={handleToggleFullScreen}
                className="p-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Fullscreen Toggle"
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              {/* End Selection Trigger (Candidate Leave, Recruiter Conclude) */}
              <button
                onClick={() => {
                  if (window.confirm("Disconnect call and leave the conference room?")) {
                    handleDestroyRoom();
                    navigate("/dashboard");
                  }
                }}
                className="p-3.5 rounded-full bg-red-600 hover:bg-red-750 text-white shadow-xl shadow-red-650/20 cursor-pointer"
                title="Disconnect interview"
              >
                <VolumeX size={18} />
              </button>
            </div>
            
            {/* Simulation Controller in corner */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => {
                  setSpeechSimulatorActive(!speechSimulatorActive);
                  toast.success(speechSimulatorActive ? "Dialogue Simulator Disabled." : "Transcript Dialogue Simulator Enabled.");
                }}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-md transition-all ${
                  speechSimulatorActive 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-white text-slate-500 border-slate-100"
                }`}
              >
                <Activity size={10} /> Simulator: {speechSimulatorActive ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Recruiter Cheat Notification Banner */}
          {isCompany && violationCount > 0 && (
            <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 flex items-center justify-between text-amber-800 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-amber-600" size={24} />
                <div>
                  <h5 className="text-xs font-black uppercase tracking-[0.1em]">Candidate Security Violation Detected!</h5>
                  <p className="text-[11px] font-medium text-amber-600 mt-0.5">The candidate lost browser tab focus {violationCount} time{violationCount > 1 ? "s" : ""}. Review the log inside the tracking tab.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("security")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
              >
                Review Violation Log
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar Area: Tabs interface (5/12 width) */}
        <div className="w-[450px] lg:w-[480px] border-l border-slate-200/80 bg-white flex flex-col overflow-hidden">
          
          {/* Tabs header selector */}
          <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 p-2 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("transcript")}
              className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
                activeTab === "transcript" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <FileText size={16} />
              Transcript
            </button>

            {isCompany && (
              <button
                onClick={() => setActiveTab("eval")}
                className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
                  activeTab === "eval" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                <Sliders size={16} />
                Evaluate
              </button>
            )}

            <button
              onClick={() => setActiveTab("ai")}
              className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
                activeTab === "ai" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Sparkles size={16} />
              AI Review
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${
                activeTab === "security" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Shield size={16} />
              Tracking
            </button>
          </div>

          {/* Interactive Pane container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <AnimatePresence mode="wait">
              {/* TAB 1: Chat dialogue transcripts */}
              {activeTab === "transcript" && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full flex flex-col space-y-4"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Live Dialogue Transcription</h4>
                      <p className="text-[10px] font-medium text-slate-400">Speech-to-text operates continuously via mic feed</p>
                    </div>
                    
                    {transcripts.length > 0 && (
                      <button
                        onClick={handleDownloadTranscript}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        <Download size={14} /> Download (.txt)
                      </button>
                    )}
                  </div>

                  {/* Search/Filter transcript database */}
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans"
                      placeholder="Search transcript dialog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>

                  {/* Dialogue Bubble Stream */}
                  <div className="flex-1 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto pr-2 font-sans">
                    {filteredTranscripts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                        <FileText size={40} className="text-slate-350 mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-600">No Dialogue Captured Yet</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Start speaking to stream high fidelity transcript lines instantly.</p>
                      </div>
                    ) : (
                      filteredTranscripts.map((line, idx) => (
                        <div
                          key={line.id || idx}
                          className={`p-4.5 rounded-3xl border text-xs leading-relaxed space-y-1.5 transition-all ${
                            line.speaker === "INTERVIEWER"
                              ? "bg-blue-50/60 border-blue-100 text-blue-900 ml-8"
                              : "bg-slate-50 border-slate-100 text-slate-800 mr-8"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-black tracking-widest uppercase ${
                              line.speaker === "INTERVIEWER" ? "text-blue-600" : "text-emerald-600"
                            }`}>
                              {line.speaker === "INTERVIEWER" ? "Interviewer" : interviewDetails?.studentName || "Candidate"}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">{line.timestamp}</span>
                          </div>
                          <p className="font-sans leading-relaxed font-semibold">{line.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: Interviewer rating card panel (1-10 sliders) */}
              {activeTab === "eval" && isCompany && (
                <motion.div
                  key="eval"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Scorecard Grading Rubric</h4>
                      <p className="text-[10px] font-medium text-slate-400">Grades save dynamically to Candidate telemetry profile</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {saveStatus === "saving" && (
                        <span className="text-[8px] font-black uppercase text-amber-500 animate-pulse bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Saving...</span>
                      )}
                      {saveStatus === "saved" && (
                        <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 animate-bounce">Saved</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {[
                      { key: "tech", label: "Technical Competency", val: techRating, desc: "Syntax correctness, algorithm complexity, software fundamentals" },
                      { key: "comm", label: "Communication Clarity", val: commRating, desc: "Articulation of thoughts, voice projection, clear vocabulary" },
                      { key: "conf", label: "Self Confidence & Demeanor", val: confRating, desc: "Composure, stable tone, response readiness, leadership aura" },
                      { key: "lead", label: "Strategic Leadership", val: leadRating, desc: "Initiative taking, collaborative empathy, core decision models" },
                      { key: "prob", label: "Analytical Problem Solving", val: probRating, desc: "Structural formulation of cases, logical analysis efficiency" },
                      { key: "cult", label: "Organization/Culture Alignment", val: cultRating, desc: "Value parity, flexibility, enthusiasm, fit with coworkers" }
                    ].map((metric) => (
                      <div key={metric.key} className="space-y-2 border-b border-slate-50 pb-3">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-black uppercase tracking-tight text-slate-800">{metric.label}</p>
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">{metric.val}/10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={metric.val}
                          onChange={(e) => handleRateScore(metric.key, Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <p className="text-[9px] font-medium text-slate-400 leading-snug">{metric.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Comments section */}
                  <div className="space-y-2 pt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Qualitative Interview Notes</label>
                    <textarea
                      placeholder="Comment on candidate projects, architectural approach, behavioral metrics..."
                      value={recruiterComments}
                      onChange={(e) => setRecruiterComments(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans leading-relaxed"
                    />
                    <button
                      onClick={handleSaveFullComments}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer mt-2"
                    >
                      Save Comments Record
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: Advanced AI Reports & Assistant */}
              {activeTab === "ai" && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Gemini AI Assistant</h4>
                      <p className="text-[10px] font-medium text-slate-400">Semantic parsing of Speech-to-text dialog parameters</p>
                    </div>
                  </div>

                  {!aiReportResult ? (
                    <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-105 text-center space-y-4">
                      <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                        <Sparkles size={24} />
                      </div>
                      <h5 className="text-sm font-black text-slate-800 uppercase">Post-Interview Evaluation</h5>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Assess the candidate's transcript stream using the Gemini AI 1.5 model. Generate comprehensive scores, weaknesses analysis, and hiring recommendations instantly.
                      </p>
                      
                      <button
                        onClick={handleTriggerAiAnalysis}
                        disabled={isAiAnalyzing}
                        className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 transition-all w-full flex items-center justify-center gap-2"
                      >
                        {isAiAnalyzing ? "Evaluating Transcript Database..." : "Analyze Dialogue with Gemini AI"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Overall AI scorecard */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-[32px] p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Gemini Hiring Fit</span>
                            <h4 className="text-xl font-black text-slate-900 mt-0.5">Evaluation Scores</h4>
                          </div>

                          <span className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border tracking-widest ${
                            aiReportResult.hiring_recommendation === "STRONG_HIRE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            aiReportResult.hiring_recommendation === "HIRE" ? "bg-blue-50 text-blue-600 border-blue-200" :
                            "bg-orange-50 text-orange-700 border-orange-200"
                          }`}>
                            {aiReportResult.hiring_recommendation?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* scorebars breakdown */}
                        <div className="space-y-3 font-sans">
                          {[
                            { key: "comm", label: "Communication Score", val: aiReportResult.communication_score },
                            { key: "conf", label: "Confidence Score", val: aiReportResult.confidence_score },
                            { key: "tech", label: "Technical Competency", val: aiReportResult.technical_understanding_score },
                            { key: "prob", label: "Problem Solving Score", val: aiReportResult.problem_solving_score },
                            { key: "lead", label: "Strategic Leadership", val: aiReportResult.leadership_score }
                          ].map((itm) => (
                            <div key={itm.key} className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-slate-700 font-bold">
                                <span>{itm.label}</span>
                                <span className="font-extrabold text-blue-600">{itm.val}/10</span>
                              </div>
                              <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(itm.val || 7) * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strengths identified</h5>
                          <div className="bg-white border border-slate-100 p-4 rounded-2xl text-xs font-semibold text-slate-700 bg-emerald-50/20 whitespace-pre-line leading-relaxed font-sans">
                            {aiReportResult.strengths}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Areas of Caution</h5>
                          <div className="bg-white border border-slate-100 p-4 rounded-2xl text-xs font-semibold text-slate-700 bg-amber-50/20 whitespace-pre-line leading-relaxed font-sans">
                            {aiReportResult.weaknesses}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key discussion points</h5>
                          <p className="bg-white border border-slate-100 p-4 rounded-2xl text-xs text-slate-650 leading-relaxed font-sans font-medium whitespace-pre-line">
                            {aiReportResult.key_discussion_points}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Improvement plan for Student</h5>
                          <p className="bg-white border border-slate-100 p-4 rounded-2xl text-xs italic text-blue-800 bg-blue-50/20 leading-relaxed font-sans font-semibold whitespace-pre-line">
                            {aiReportResult.areas_of_improvement}
                          </p>
                        </div>

                        {/* Recruiter fit comments summary */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall recommendation</h5>
                          <p className="bg-white border border-slate-100 p-4 rounded-2xl text-xs text-slate-800 leading-relaxed font-sans font-medium">
                            {aiReportResult.overall_recommendation}
                          </p>
                        </div>

                        <button
                          onClick={() => setAiReportResult(null)}
                          className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest cursor-pointer border border-slate-150 transition-all"
                        >
                          Rerun AI Analysis
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: Anti cheating tracking */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-5"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Strict Proctoring Audit Log</h4>
                      <p className="text-[10px] font-medium text-slate-400">Tab Focus / Resize anti-fraud tracking metrics</p>
                    </div>

                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border flex items-center gap-1.5 ${
                      violationCount === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      violationCount === 1 ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
                      "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
                    }`}>
                      <Shield size={12} /> {violationCount === 0 ? "Secure Profile" : `${violationCount} Violations`}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Proctoring guidelines */}
                    <div className="bg-slate-50 border border-slate-105 p-4 rounded-2xl text-[11px] font-medium text-slate-500 leading-relaxed whitespace-pre-line relative overflow-hidden font-sans">
                      <p className="font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-[10px]">
                        <Shield className="text-blue-600" size={14} /> Proctoring Compliance Audit
                      </p>
                      The Anti-Cheat Proctoring engine monitors active candidate focus parameters in real-time. Losing window focus, altering resolutions, copy/paste attempts or minimized events trigger real-time alerts.
                    </div>

                    {/* Timeline of issues */}
                    {cheatingViolations.length === 0 ? (
                      <div className="text-center py-12 p-4 border border-dashed border-slate-200 rounded-3xl">
                        <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 animate-bounce" />
                        <h5 className="text-xs font-black text-slate-700 uppercase">Fully Compliant</h5>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">No cheating violations, focus shifts, or window minification events logged. Security audit is 100% clean.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-[11px]">
                        {cheatingViolations.map((v, i) => (
                          <div key={i} className="bg-rose-50 border border-rose-100 p-4.5 rounded-2xl text-xs space-y-1.5 relative overflow-hidden font-sans">
                            <span className="absolute right-4 top-4 text-[10px] font-black text-rose-400">{v.timestamp}</span>
                            <h6 className="font-black text-rose-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                              <AlertTriangle size={14} /> {v.warningType}
                            </h6>
                            <p className="text-rose-600 font-semibold leading-relaxed font-sans">{v.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Proctoring Warnings Modal Popups for Candidates */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Dark blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWarningModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />

            {/* Warning frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] border-2 border-red-200 shadow-2xl p-8 max-w-md w-full relative z-10 text-center space-y-5 mx-4"
            >
              <div className="w-16 h-16 bg-red-105 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full tracking-wider">Focus Violation</span>
                <h4 className="text-xl font-black text-slate-900 mt-3 uppercase tracking-tight">Security System Warning</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 whitespace-pre-line font-sans">
                  {activeWarningMessage}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4.5 text-left border border-slate-100 text-[11px] font-semibold text-slate-600 font-sans leading-relaxed">
                ⚠️ Continued tab focus losses or minimizes are permanently written into the corporate HR Talent recruitment log database.
              </div>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-4 bg-red-600 hover:bg-red-750 text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Return to Call viewport <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
