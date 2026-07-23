import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import api from "./api.ts";

export class LiveInterviewService {
  private ai: GoogleGenAI | null = null;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private videoInterval: any = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public isResumedSession: boolean = false;
  public previousTranscript: string = "";
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "ai", text: string) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    // Left empty. Gemini API client is dynamically initialized when start() is called.
  }

  async start(resumeText: string, externalStream?: MediaStream) {
    try {
      this.onStateChange("processing");

      // Fetch the key dynamically from the backend
      const keyResponse = await api.get("/ai/live-key");
      const apiKey = keyResponse.data.key;
      if (!apiKey) {
        throw new Error("Unable to start interview: Gemini Live API key is missing or not configured.");
      }
      this.ai = new GoogleGenAI({ apiKey });
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported in this browser");
      }
      
      // Use local variables to avoid race conditions during async setup
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      const playbackCtx = new AudioContextClass({ sampleRate: 24000 });

      // Browsers require a resume() call inside a user gesture
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (playbackCtx.state === 'suspended') await playbackCtx.resume();
      
      this.audioContext = audioCtx;
      this.playbackContext = playbackCtx;
      this.nextPlayTime = this.playbackContext.currentTime;

      // Track if we own the stream or if it's external
      const isExternal = !!externalStream;
      if (externalStream) {
        this.mediaStream = externalStream;
      } else {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
      }

      if (!this.audioContext) throw new Error("AudioContext was nulled during initialization");
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.audioWorkletNode.port.onmessage = (e) => {
        if (this.sessionPromise) {
          this.sessionPromise.then(session => {
            const pcm16Buffer = e.data;
            
            let binary = '';
            const bytes = new Uint8Array(pcm16Buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = btoa(binary);

            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          });
        }
      };

      this.source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);

      // Video Frame Capture
      if (this.mediaStream && this.mediaStream.getVideoTracks().length > 0) {
        // Try to find an existing video element or use a hidden one
        let video = document.getElementById("ai-interview-capture-video") as HTMLVideoElement;
        if (!video) {
          video = document.createElement("video");
          video.id = "ai-interview-capture-video";
          video.style.display = "none";
          video.setAttribute('playsinline', 'true');
          document.body.appendChild(video);
        }
        
        if (video.srcObject !== this.mediaStream) {
          video.srcObject = this.mediaStream;
          video.muted = true;
          video.play().catch(console.error);
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        this.videoInterval = setInterval(() => {
          if (!this.sessionPromise) return;
          this.sessionPromise.then(session => {
            try {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = 320; 
                canvas.height = (video.videoHeight / video.videoWidth) * 320;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const base64Frame = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
                session.sendRealtimeInput({
                  video: {
                    mimeType: "image/jpeg",
                    data: base64Frame
                  }
                });
              }
            } catch (err) {
              console.warn("Frame capture failed:", err);
            }
          });
        }, 3000); // Every 3 seconds
      }

      let profileData: any = { role: "Software Engineer", level: "Fresher", techstack: [], focus: "Mixed", difficulty: "Medium", communication: "Voice" };
      try {
        const parsed = JSON.parse(resumeText);
        if (parsed.role) profileData = parsed;
      } catch (e) {
        profileData.role = resumeText.substring(0, 50); // Fallback for old resume strings
      }

      // Determine focus-specific instructions for world-class simulation
      const interviewFocus = profileData.focus || "Mixed";
      let focusRoleplayDirectives = "";
      let flowDirectives = `
      1. **Introduction**: Greet the candidate warmly and ask them to introduce themselves.
      2. **Resume & Projects**: Based on their introduction, ask 1-2 questions about their tech stack or background.
      3. **Dynamic Rounds**: Start with fundamentals suited for ${profileData.difficulty} level. If they answer correctly, progressively increase difficulty. If they struggle, provide a quick hint or ask a simpler variation.
      4. **Adaptive Follow-ups**: Do not ask random questions. Probe deeper into their previous responses.
      5. **Scenario-Based**: Ask them to solve a real-world problem using their tech stack.`;

      if (interviewFocus.includes("Technical")) {
        focusRoleplayDirectives = `
        ROLE-PLAY DIRECTIVES (TECHNICAL INTERVIEW SPECIALIST):
        - Your goal is to evaluate technical depth, problem-solving, architectural acumen, and code hygiene.
        - Ask standard and advanced conceptual questions based on their target technologies (${(profileData.techstack || []).join(", ")}).
        - Focus on algorithms, data structures, scaling, caching, database indexing, and memory allocation.
        - Encourage them to explain their logic step-by-step.
        - Set questions appropriate for of experience level: ${profileData.level}.`;
        
        flowDirectives = `
        1. **Introduction**: Greet the candidate warmly and ask them to introduce themselves and highlight their engineering experience.
        2. **Technical Deep Dive**: Ask targeted technical questions based on their confident technologies (${(profileData.techstack || []).join(", ")}).
        3. **Scenario / System Design**: Describe a scaling, debugging, or system design problem suited for ${profileData.difficulty} level and ask how they would code/architect a solution.
        4. **Edge Cases**: Ask follow-up questions probing trade-offs, performance optimization, and failure handling.
        5. **Synthesis**: Challenge them with a high-level architectural trade-off or coding paradigm challenge.`;
      } else if (interviewFocus.includes("HR")) {
        focusRoleplayDirectives = `
        ROLE-PLAY DIRECTIVES (HR / BEHAVIORAL SPECIALIST):
        - Your goal is to evaluate emotional intelligence, communication clarity, cultural alignment, work ethics, and career drive.
        - Focus on behavioral scenarios using the STAR method (Situation, Task, Action, Result).
        - Probe standard themes: leadership, conflict resolution, coping with failure, adaptability, and vision matching.
        - Do not focus on coding or technical trivia; test how they collaborate, receive negative feedback, or handle challenging work relationships.`;
        
        flowDirectives = `
        1. **Introduction**: Greet the candidate warmly and ask them to introduce themselves and explain why they want to work at ${profileData.company || 'our company'}.
        2. **Core Motivation**: Ask about their career goals, alignment with company values, and why they fit the ${profileData.role} position.
        3. **Situational Challenge (STAR Method)**: Ask for a specific story illustrating conflict resolution, working under pressure, or handling an error/failure.
        4. **Collaboration & Culture**: Ask behavioral questions investigating how they handle team disagreements, give/receive feedback, and participate in collaborative spaces.
        5. **Growth Mindset**: Ask how they keep up with professional changes and adapt to dynamic, fast-paced work settings.`;
      } else if (interviewFocus.includes("Managerial")) {
        focusRoleplayDirectives = `
        ROLE-PLAY DIRECTIVES (ENGINEERING MANAGER / DIRECTOR):
        - Your goal is to evaluate leadership capabilities, team coaching, system execution, resource estimation, and trade-offs under pressure.
        - Focus on direct-report growth, resolving delivery roadblocks, agile sprint planning, and system architecture ownership.
        - Inquire about their delegation strategy, cross-functional engineering, and alignment with business objectives.`;
        
        flowDirectives = `
        1. **Introduction**: Greet the candidate warmly and ask them to introduce themselves, sharing their previous leadership or project-management experience.
        2. **Leadership Philosophy**: Ask about their general management style, team coaching principles, and how they foster healthy development culture.
        3. **Project Management & Execution**: Ask how they estimate resources, handle severe scope creep, align with product/design timelines, or deal with missing milestones.
        4. **Conflict & Team Growth**: Ask scenarios such as: "How do you handle a senior engineer who refuses to follow team standards?" or "Describe how you've handled low-performing team members."
        5. **Resource Trade-offs**: Ask a scenario regarding delivery constraints vs technical debt and how they weigh those conflicts.`;
      } else if (interviewFocus.includes("Introduction") || interviewFocus.includes("Pitch")) {
        focusRoleplayDirectives = `
        ROLE-PLAY DIRECTIVES (INTRODUCTION & ELEVATOR PITCH SPECIALIST):
        - Your main goal is to coach and evaluate the candidate's self-introduction (elevator pitch).
        - You must guide them step-by-step on how a professional introduction must be structured.
        - The standard structural model for an outstanding elevator pitch is:
          1. The Hook (Present): Who they are, their core expertise, passions, and current focus area.
          2. The Proof (Past): Relevant academic or professional projects and achievements that match ${profileData.role}.
          3. The Future: Real excitement and clear value proposition indicating why they are perfect for this role.
        - Provide active, constructive coaching and feedback. Guide them in perfecting these components.
        - Gently highlight areas for improvements, such as rambling, unconfident tone, lack of relevance, or forgetting a call to action.`;

        flowDirectives = `
        1. **Pitch Definition & Start**: Welcome the student to this special self-introduction mastery session. Explain the 3 core pillars (Present Hook, Past Achievements/Projects/Skills, Future connection/goals) clearly and invite them to give their raw first-draft self-introduction.
        2. **Present Hook Coaching**: Give short, targeted constructive feedback on their greeting & hook. Ask them to reframe or enrich the "Present" portion to align with ${profileData.role}.
        3. **Highlighting Achievements/Skills**: Ask them about their main achievements or academic projects. Coach them on translating lists of features/skills into high-impact highlights.
        4. **Expressing Future Motivation**: Guide them on how to express sincere motivation for ${profileData.company || "the target company"} and explain how their skills solve key problems.
        5. **Polished Master Pitch**: Challenge them to assemble all these coached adjustments and deliver their final self-introduction from start to finish. Conclude with feedback on this final result.`;
      } else if (interviewFocus.includes("Salary") || interviewFocus.includes("Negotiation") || interviewFocus.includes("Compensation")) {
        focusRoleplayDirectives = `
        ROLE-PLAY DIRECTIVES (RECRUITER & COMPENSATION NEGOTIATOR):
        - Your goal is to role-play a classic Salary and Compensation negotiation session.
        - Act as the hiring manager/recruiter extending a verbal offer for the ${profileData.role} position${profileData.company ? ` at ` + profileData.company : ''}.
        - OFFER PARAMETERS: Quote an initial starting base offer of $110,000, with standard medical benefits and 15 days paid PTO.
        - NEGOTIATION DYNAMICS: If they push for a higher base salary, counter with realistic, professional friction (e.g., standard pay bands, midpoint entry, performance-based bonus reviews, or flexible offsets like equity or sign-on checks).
        - Evaluate their tone, poise, self-worth, diplomacy, and value-based persuasion. Challenge them to justify counteroffers based on their skills and market standards.`;

        flowDirectives = `
        1. **Offer Presentation (Introduction)**: Express high excitement, deliver the verbal offer parameters, and request candidate feedback on the numbers.
        2. **Core Objection Handling**: Allow the candidate to negotiate, state their requirements, and provide professional pushbacks or counter-narratives.
        3. **Value Articulation**: Prompt them to articulate the high value, unique skills, or competitive offers that justify their adjustment requests.
        4. **Creative Benefits**: Explore other variables if base salary limits are hit (e.g., sign-on bonuses, relocation support, stock/equity grants, or additional PTO).
        5. **Resolution**: Make a final reasonable compromise offer or finalize terms diplomatically, ensuring a positive professional wrap-up.`;
      }

      const systemInstruction = `You are Aoede, a world-class senior interviewer and executive recruitment specialist.
      You are conducting an immersive, realistic mock session tailored to the candidate's custom career path.

      CANDIDATE PROFILE:
      Target Role: ${profileData.role}
      Target Company: ${profileData.company ? profileData.company : "General"}
      Experience Level: ${profileData.level}
      Confident Technologies: ${(profileData.techstack || []).join(", ")}
      Interview Format/Type: ${interviewFocus}
      Difficulty Standard: ${profileData.difficulty}

      ${focusRoleplayDirectives}

      INTERVIEW FLOW RULES:
      ${flowDirectives}

      COMMUNICATION RULES:
      - Communication Mode: ${profileData.communication}. If "Text", keep it highly concise.
      - RECALL YOUR CORE CHARACTER: Be warm, professional, authentic, and highly conversational. Do NOT sound robotic or academic. Keep questions short, crisp, and clean (max 2-3 sentences).
      - Ask exactly ONE question at a time. Let the candidate respond!
      - DO NOT praise every single response with "Great answer" or "Excellent." Instead, give short validation (e.g. "That makes sense," "Interesting approach," or "Got it") and ask your next natural probing/follow-up question.
      - PROACTIVITY: If they are silent for over 7 seconds or mention being stuck, offer a polite hint or rephrase.

      EVALUATION & ENDING:
      - You must evaluate accurately based on the session's overall quality.
      - Ask exactly 5 professional turns/questions total (e.g., 5 sequential rounds of dialog).
      - IMPORTANT: Once the candidate has responded to your 5th question, you must IMMEDIATELY conclude the session by calling the 'finalizeInterview' tool. Do NOT say goodbye or start a 6th conversation round; simply call the tool.
      - Include fully populated 'questions_and_answers' containing all questions you asked, the candidate's exact (or summarized) answers, and the correct/ideal answer ('actual_answer') explaining standard best practices for each question. For Salary Negotiations, correct/ideal answers represent best practices for negotiation strategy, framing, and value-based leverage.`;

      if (!this.ai) {
        throw new Error("GoogleGenAI client is not initialized.");
      }

      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "finalizeInterview",
                description: "End the interview session and provide the final evaluation report.",
                parameters: {
                  type: "object" as any,
                  properties: {
                    scores: {
                      type: "object" as any,
                      properties: {
                        communication: { type: "number" as any },
                        confidence: { type: "number" as any },
                        explanation: { type: "number" as any },
                        presentation: { type: "number" as any },
                        knowledge: { type: "number" as any },
                        overall: { type: "number" as any }
                      },
                      required: ["communication", "confidence", "explanation", "presentation", "knowledge", "overall"]
                    },
                    detailed_feedback: { type: "string" as any },
                    strengths: { type: "array" as any, items: { type: "string" as any } },
                    weaknesses: { type: "array" as any, items: { type: "string" as any } },
                    improvement_tips: { type: "array" as any, items: { type: "string" as any } },
                    questions_and_answers: {
                      type: "array" as any,
                      items: {
                        type: "object" as any,
                        properties: {
                          question: { type: "string" as any },
                          user_answer: { type: "string" as any },
                          actual_answer: { type: "string" as any }
                        },
                        required: ["question", "user_answer", "actual_answer"]
                      }
                    }
                  },
                  required: ["scores", "detailed_feedback", "strengths", "weaknesses", "improvement_tips", "questions_and_answers"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("SUCCESS: Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("DEBUG: Received Message:", message);

            if (message.setupComplete && this.sessionPromise) {
              console.log("DEBUG: Setup Complete. Sending initial trigger turn.");
              if (this.isResumedSession && this.previousTranscript) {
                this.sendText(`We are resuming an active mock interview that was briefly interrupted. 
Here is our conversation history so far:
---
${this.previousTranscript}
---
Please greet the candidate warmly acknowledging the quick connection recovery, recap where we were, and ask the next natural question.`);
              } else {
                const isNegotiation = profileData.focus && (profileData.focus.includes("Salary") || profileData.focus.includes("Negotiation") || profileData.focus.includes("Compensation"));
                const isIntro = profileData.focus && (profileData.focus.includes("Introduction") || profileData.focus.includes("Pitch"));
                const triggerMsg = isNegotiation 
                  ? `We are starting a live Salary Negotiation session now. Greet the candidate warmly, celebrate their offer for cleared interviews of the ${profileData.role} role${profileData.company ? ` at ` + profileData.company : ''}, present the initial starting salary package of $110,000 base, and ask for their verbal feedback on it.`
                  : isIntro
                    ? `We are starting an Introduction Mock Interview and Pitch prep session now. Greet the candidate warmly, state that today we will design and perfect their professional self-introduction for the ${profileData.role} role${profileData.company ? ` at ` + profileData.company : ''} together, and ask them to give their draft self-introduction now.`
                    : `Start the mock interview session now. Greet the candidate warmly, state the target role is ${profileData.role}, and ask them to introduce themselves.`;
                this.sendText(triggerMsg);
              }
            }
            
            // Handle Model Turn
            const modelTurn = message.serverContent?.modelTurn;
            if (modelTurn) {
              const parts = modelTurn.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.onStateChange("speaking");
                  this.playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  this.onMessage("ai", part.text);
                }
              }
            }

            // Handle Server Content Transcription (input audio)
            const userSpeech = (message.serverContent as any)?.inputAudioTranscription?.text;
            if (userSpeech) {
              this.onMessage("user", userSpeech);
            }

            if (message.serverContent?.interrupted) {
              console.log("AI Interrupted via server signal");
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Tool Calls
            const toolCall = (message as any).toolCall;
            if (toolCall) {
              const functionCalls = toolCall.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                  if (call.name === "finalizeInterview") {
                    const args = call.args as any;
                    (this as any)._finalReport = args;
                    this.onMessage("ai", "[INTERVIEW_COMPLETED]");
                    this.sessionPromise?.then(session => {
                      session.sendToolResponse({
                        functionResponses: [{
                          name: call.name,
                          id: call.id,
                          response: { status: "Interview finalized. Evaluated." }
                        }]
                      });
                    });
                  }
                }
              }
            }
          },
          onclose: (event) => {
            console.log("Live API Closed:", event);
            this.onStateChange("idle");
          },
          onerror: (err) => {
            console.error("Live API Error Callback:", err);
            this.onError("Connection lost.");
            this.stop();
          }
        }
      });

      // Removed manual session assignment to avoid race conditions with sessionPromise
    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.onError("Failed to access microphone or connect to AI.");
      this.stop();
    }
  }

  private activeSources: AudioBufferSourceNode[] = [];
  
  private async playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      console.log(`DEBUG: playAudioChunk context state: ${this.playbackContext.state}`);
      if (this.playbackContext.state === 'suspended') {
        await this.playbackContext.resume();
        console.log(`DEBUG: playAudioChunk context resumed to: ${this.playbackContext.state}`);
      }

      const rawBinaryString = atob(base64Data);
      const rawByteLength = rawBinaryString.length;
      console.log(`DEBUG: playAudioChunk base64 byte length: ${rawByteLength}`);
      const rawBytes = new Uint8Array(rawByteLength);
      for (let i = 0; i < rawByteLength; i++) {
        rawBytes[i] = rawBinaryString.charCodeAt(i);
      }
      
      const pcmSampleCount = Math.floor(rawByteLength / 2);
      if (pcmSampleCount === 0) return;

      const pcmInt16Data = new Int16Array(pcmSampleCount);
      const pcmDataView = new DataView(rawBytes.buffer);
      for (let i = 0; i < pcmSampleCount; i++) {
        pcmInt16Data[i] = pcmDataView.getInt16(i * 2, true);
      }

      const pcmAudioBuffer = this.playbackContext.createBuffer(1, pcmSampleCount, 24000);
      const pcmChannelData = pcmAudioBuffer.getChannelData(0);
      
      for (let i = 0; i < pcmSampleCount; i++) {
        pcmChannelData[i] = pcmInt16Data[i] / 32768.0;
      }
      
      const pcmBufferSource = this.playbackContext.createBufferSource();
      pcmBufferSource.buffer = pcmAudioBuffer;
      pcmBufferSource.connect(this.playbackContext.destination);
      
      console.log(`DEBUG: Playing audio chunk, size: ${pcmSampleCount} samples`);
      
      const pcmCurrentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < pcmCurrentTime) {
        this.nextPlayTime = pcmCurrentTime;
      }
      
      console.log(`DEBUG: Scheduling audio at ${this.nextPlayTime} (current: ${pcmCurrentTime}, duration: ${pcmAudioBuffer.duration})`);
      
      pcmBufferSource.start(this.nextPlayTime);
      this.activeSources.push(pcmBufferSource);
      this.nextPlayTime += pcmAudioBuffer.duration;
      this.isPlaying = true;
      
      pcmBufferSource.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== pcmBufferSource);
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources = [];
    this.nextPlayTime = this.playbackContext?.currentTime || 0;
    this.isPlaying = false;
  }

  stop() {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      // ONLY stop tracks if we created the stream. If it was passed externally,
      // it's the caller's responsibility to stop it (e.g. InterviewPage).
      // This prevents the "black camera" issue if cleanup accidentally closes a shared stream.
      // However, we should still disconnect from our context.
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.stopPlayback();
    
    const hiddenVideo = document.getElementById("ai-interview-capture-video");
    if (hiddenVideo) {
      if ((hiddenVideo as HTMLVideoElement).srcObject) {
         (hiddenVideo as HTMLVideoElement).srcObject = null;
      }
      hiddenVideo.remove();
    }
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        console.log("DEBUG: Sending text input:", text);
        session.sendRealtimeInput({ text });
      });
    }
  }

  getFinalReport() {
    return (this as any)._finalReport;
  }
}
