import { Server, Socket } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function setupInterviewSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("New interview session started:", socket.id);

    let chatSession: any = null;
    let studentId: number | null = null;
    let resumeText = "";
    let silenceTimer: any = null;

    const startSilenceDetection = () => {
      stopSilenceDetection();
      silenceTimer = setTimeout(async () => {
        if (chatSession) {
          console.log("DEBUG: Silence detected in socket session", socket.id);
          try {
            const nudge = await chatSession.sendMessage({ 
              message: "[SYSTEM: The candidate has been silent for 10 seconds. They might be stuck. Please proactively offer a small hint or gently rephrase the current question to help them move forward.]" 
            });
            socket.emit("ai_message", { text: nudge.text, isHint: true });
            // Restart timer after nudge
            startSilenceDetection();
          } catch (err) {
            console.error("Silence nudge error:", err);
          }
        }
      }, 10000); // 10 seconds of silence
    };

    const stopSilenceDetection = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    socket.on("start_interview", async (data) => {
      const { userId, resume } = data;
      const { XPService } = await import("../services/xpService.ts");
      
      try {
        await XPService.spendInterviewCredit(userId);
      } catch (err: any) {
        return socket.emit("error", "INSUFFICIENT_CREDITS");
      }

      studentId = userId;
      resumeText = resume || "No resume provided.";

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are Aoede, a charismatic and sharp senior technical interviewer.
          
          MOCK INTERVIEW MODE:
          1. Conduct a "Gemini Live" style 1-on-1 interview.
          2. BE EXTREMELY BRIEF. Use only 1-2 sentences per response. 
          3. Ask questions that feel natural and conversational.
          4. If the candidate is vague, ask a quick follow-up. 
          5. Never use markdown formatting (no bold/italics/bullets) as this is for voice.
          
          ACCURACY & GUIDANCE:
          - Your evaluation must be 100% accurate based on technical depth.
          - If the candidate repeats the same answer or seems stuck, call it out politely and offer a hint or a slightly easier question.
          - If you receive a [SYSTEM] message about silence, it means the user is stuck. Immediately offer a gentle hint or rephrase.
          
          Start immediately with a very friendly greeting and your first question based on their profile.`
        }
      });
      chatSession = chat;

      const initial = await chat.sendMessage({ message: "Please start the interview now with a greeting and a first question." });
      socket.emit("ai_message", { text: initial.text });
      startSilenceDetection();
    });

    socket.on("user_message", async (message: string) => {
      if (!chatSession || !message) return;
      stopSilenceDetection();

      try {
        const result = await chatSession.sendMessage({ message });
        socket.emit("ai_message", { text: result.text });
        startSilenceDetection();
      } catch (error) {
        console.error("AI Response Error:", error);
        socket.emit("error", "I'm having trouble hearing you. Can you repeat that?");
        startSilenceDetection();
      }
    });

    socket.on("disconnect", () => {
      console.log("Interview session ended:", socket.id);
      stopSilenceDetection();
    });
  });
}
