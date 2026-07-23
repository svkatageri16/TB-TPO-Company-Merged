import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";

// Initialize Gemini directly, using GEMINI_API_KEY from environment
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const systemPrompt = `You are VEGA AI, an intelligent career assistant helping students with:
- Jobs
- Resume building
- Interview preparation
- Coding guidance
- Career planning

You have access to the platform context and User Analytics.

Your responses must be:
- Short & Concise
- Intelligent
- Motivational
- Professional
- Action-oriented

If the user wants to navigate the app, include a navigation command block in your output formatted EXACTLY like this:
[ACTION:NAVIGATE:/jobs]
or [ACTION:NAVIGATE:/student]
or [ACTION:NAVIGATE:/ai-interview]
and so on.

Do NOT use generic filler text. Focus on career growth and employability.`;

export class ChatbotService {
  
  static async loadConversationHistory(userId: number) {
    try {
      const [rows]: any = await db.query(
        "SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY timestamp ASC",
        [userId]
      );
      return rows;
    } catch (e: any) {
      console.error("Failed to load chat history:", e.message);
      return [];
    }
  }

  static async saveMessage(userId: number, role: 'USER' | 'AI', message: string) {
    try {
      await db.query(
        "INSERT INTO ai_conversations (user_id, role, message) VALUES (?, ?, ?)",
        [userId, role, message]
      );
    } catch (e: any) {
      console.error("Failed to save chat message:", e.message);
    }
  }

  static async getUserContext(userId: number) {
    // Gather basic analytics or profile data to enrich the prompt context
    let context = "";
    try {
      const [stats]: any = await db.query("SELECT * FROM student_performance_stats WHERE user_id = ?", [userId]);
      const [profile]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId]);
      const [interviews]: any = await db.query("SELECT COUNT(*) as count FROM interview_history WHERE student_id = (SELECT id FROM student_profiles WHERE user_id = ?)", [userId]);
      const [apps]: any = await db.query("SELECT COUNT(*) as count FROM job_applications WHERE student_id = (SELECT id FROM student_profiles WHERE user_id = ?)", [userId]);
      
      if (profile.length > 0) {
        context += `Name: ${profile[0].full_name || 'Unknown'}. `;
        context += `Experience: ${profile[0].experience_type}. `;
        context += `Profile Completeness: ${profile[0].completeness_score}%. `;
        if (profile[0].skills_json) {
          try {
            const parsedSkills = JSON.parse(profile[0].skills_json);
            context += `Skills: ${parsedSkills.join(", ")}. `;
          } catch(e) {}
        }
      }
      if (stats.length > 0) {
        context += `Talent Score: ${stats[0].talent_score}, XP: ${stats[0].xp_points}. `;
      }
      if (interviews.length > 0) {
        context += `Completed Mock Interviews: ${interviews[0].count}. `;
      }
      if (apps.length > 0) {
        context += `Total Job Applications: ${apps[0].count}. `;
      }
    } catch (e) {
      // ignore
      console.error("Context fetch error", e);
    }
    return context || "No context available yet.";
  }

  static async getMemory(userId: number) {
    const [rows]: any = await db.query("SELECT * FROM ai_memory WHERE user_id = ?", [userId]);
    return rows[0] || null;
  }
}
