import { Router, Response } from "express";
import { authenticate } from "../middleware/auth.ts";
import { ChatbotService } from "../services/chatbotService.ts";
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";

const router = Router();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

router.get("/history", authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user!.userId;
    const history = await ChatbotService.loadConversationHistory(userId);
    res.json({ success: true, history });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ success: false, message: "Failed to load history" });
  }
});

// Using SSE for streaming responses
router.post("/chat", authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { message, platformContext } = req.body; // Context passed from frontend (e.g., current page, etc)

    // Save user message immediately
    await ChatbotService.saveMessage(userId, 'USER', message);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get DB context
    const userContext = await ChatbotService.getUserContext(userId);
    const memory = await ChatbotService.getMemory(userId);

    // Get previous history for Gemini
    const historyRows = await ChatbotService.loadConversationHistory(userId);
    const contents = historyRows.slice(-10).map((row: any) => ({
      role: row.role === 'USER' ? 'user' : 'model',
      parts: [{ text: row.message }]
    }));
    
    let enrichedSystemPrompt = `You are VEGA AI, an intelligent career assistant.
Context about user: ${userContext}
Platform Context (where user is currently): ${platformContext || 'Unknown'}
Memory (Preferences): ${memory ? JSON.stringify(memory) : 'None yet.'}

Rules:
- Be short, intelligent, professional.
- Focus strictly on career growth, employability, resume building, jobs, interview preparation.
- If the user wants to navigate to a page, output ONLY the string "[ACTION:NAVIGATE:/desired-path]" within your message.
`;

    // Seed the history if available before sending the message
    // Actually the new @google/genai chat create takes history as parameter
    const chatWithHistory = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: enrichedSystemPrompt,
        temperature: 0.7,
      },
      history: contents.slice(0, -1)
    });

    // The user message was just saved to DB, so historyRows already has it.
    // It's better to NOT pass the last message in history, and instead pass it to sendMessageStream.
    let fullResponse = "";

    try {
      const responseStream = await chatWithHistory.sendMessageStream({ message: message });
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
    } catch (apiError: any) {
       console.error("Gemini API Error details:", apiError);
       res.write(`data: ${JSON.stringify({ text: "\n\nError: " + (apiError.message || apiError) })}\n\n`);
    }

    // Attempt to update memory based on user message asynchronously (simple keyword matching or separate LLM call)
    // For simplicity, we just save the final response
    await ChatbotService.saveMessage(userId, 'AI', fullResponse);

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Chat error FULL details:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Chat error", error: error.message || String(error) });
    }
  }
});

export default router;
