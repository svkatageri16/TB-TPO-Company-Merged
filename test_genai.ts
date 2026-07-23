import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are an AI.",
      }
    });

    const res = await chat.sendMessage({ message: "test" });
    console.log("Success:", res.text);
  } catch (e: any) {
    console.error("Error:", e.message || e);
  }
}
run();
