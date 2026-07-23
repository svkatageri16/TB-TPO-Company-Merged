import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// Graceful connection error management for Redis
let redisConnection: IORedis | null = null;
let aiAssessmentQueue: Queue | null = null;
let aiAssessmentWorker: Worker | null = null;
let isRedisAvailable = false;

try {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  
  // Use lazy instantiation / safe connection handlers to prevent app-wide startup crashes
  redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
    connectTimeout: 5000,
    reconnectOnError: () => true
  });

  redisConnection.on("connect", () => {
    isRedisAvailable = true;
    console.log("🐂 Redis connected successfully for BullMQ");
  });

  redisConnection.on("error", (err) => {
    isRedisAvailable = false;
    console.warn("⚠️ Redis connection warning: Workloads will fallback to in-memory processing mode.");
  });

  // Initialize the main job queue
  aiAssessmentQueue = new Queue("ai-assessments", { 
    connection: redisConnection as any 
  });

} catch (err) {
  isRedisAvailable = false;
  console.warn("⚠️ Failed to initialize Redis/BullMQ Queue, using in-memory fallback:", err);
}

// Separate function for processing the actual evaluation to reuse in queue and fallback states
export async function processSessionEvaluation(data: { studentId: number; transcript: string }) {
  const { studentId, transcript } = data;
  console.log(`🤖 Processing AI Evaluation session for Student #${studentId}...`);
  
  const { GoogleGenAI } = await import("@google/genai");
  const db = (await import("../db.ts")).default;
  const { calculateTalentScore, updateDailyTask } = await import("./analyticsService.ts");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Cannot evaluate session: GEMINI_API_KEY environment variable is not defined");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You are an elite AI interview evaluator. Analyze the following conversational interview transcript of a technical mock interview.
  Transcript: ${transcript}
  
  Score the student's performance from 0 to 100 on these 5 dimensions:
  1. communication (general verbal flow, style)
  2. confidence (answering posture, certainty)
  3. explanation (technical accuracy, depth)
  4. presentation (handling complex topics, formatting ideas)
  5. knowledge (concrete theoretical and practical awareness)

  Also provide an overall score, general detailed feedback (max 3 sentences), a list of up to 3 strengths, 3 weaknesses, and 3 actionable improvement tips.
  
  Return strictly valid JSON with this format:
  {
    "scores": {
      "overall": 85,
      "communication": 80,
      "confidence": 90,
      "explanation": 85,
      "presentation": 80,
      "knowledge": 90
    },
    "detailed_feedback": "...",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "improvement_tips": ["...", "..."]
  }`;

  // Execute Gemini evaluation using the circuit breaker to handle transient hiccups
  const { geminiBreaker } = await import("./circuitBreakerService.ts");
  
  const rawResult = await geminiBreaker.fire({
    apiCall: async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return response.text || "";
    }
  });

  const evaluationResult = JSON.parse(rawResult);
  const scores = evaluationResult.scores || {};
  const overallScore = scores.overall || 75;

  // Retrieve student profile
  let [profiles]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [studentId]);
  let profileId = null;

  if (profiles && profiles.length > 0) {
    profileId = profiles[0].id;
    // Save to interview logs
    await db.query(`
      INSERT INTO interview_history 
      (student_id, score, communication_score, confidence_score, explanation_score, presentation_score, knowledge_score, feedback, strengths_json, weaknesses_json, tips_json, transcript_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      profileId, 
      overallScore,
      scores.communication || 75,
      scores.confidence || 75,
      scores.explanation || 75,
      scores.presentation || 75,
      scores.knowledge || 75,
      evaluationResult.detailed_feedback || "Excellent effort in this mock session.",
      JSON.stringify(evaluationResult.strengths || []),
      JSON.stringify(evaluationResult.weaknesses || []),
      JSON.stringify(evaluationResult.improvement_tips || []),
      JSON.stringify([{ role: "evaluation_summary", text: "Transcript analyzed by queue thread" }])
    ]);

    await db.query("UPDATE student_profiles SET completeness_score = LEAST(100, completeness_score + 15) WHERE id = ?", [profileId]);
  }

  // Save to modern adaptive systems table mapping
  await db.query(`
    INSERT INTO interview_sessions 
    (user_id, role, level, techstack, focus, difficulty, communication, score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
  `, [
    studentId,
    "Software Engineer",
    "Fresher",
    JSON.stringify(["Software Development"]),
    "Mixed",
    "Medium",
    "Voice",
    overallScore
  ]);

  // Update rolling stats
  const [existingPerf]: any = await db.query("SELECT id, avg_interview_score FROM student_performance_stats WHERE user_id = ?", [studentId]);
  if (existingPerf.length > 0) {
    const currentAvg = existingPerf[0].avg_interview_score || 0;
    const newAvg = (currentAvg + overallScore) / 2;
    await db.query(`
      UPDATE student_performance_stats 
      SET avg_interview_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [newAvg, studentId]);
  } else {
    await db.query(`
      INSERT INTO student_performance_stats (user_id, avg_interview_score)
      VALUES (?, ?)
    `, [studentId, overallScore]);
  }

  // Auto increment tasks and evaluate holistic talents metric
  await updateDailyTask(studentId, 'INTERVIEW');
  await calculateTalentScore(Number(studentId));

  console.log(`✅ Student #${studentId} asynchronous assessment completed and saved successfully.`);
  return evaluationResult;
}

// Initialize the Worker to handle queued task events if Redis is ready
try {
  if (redisConnection) {
    aiAssessmentWorker = new Worker("ai-assessments", async (job: Job) => {
      console.log(`📦 BullMQ Processing Job: ${job.id}`);
      await processSessionEvaluation(job.data);
    }, { 
      connection: redisConnection as any,
      concurrency: 2 // Max parallel analyses to prevent CPU exhaustion
    });

    aiAssessmentWorker.on("completed", (job) => {
      console.log(`🏆 Task Job Completed Successfully: ${job.id}`);
    });

    aiAssessmentWorker.on("failed", (job, err) => {
      console.error(`❌ Task Job Failed: ${job?.id} error:`, err);
    });
  }
} catch (e) {
  console.warn("⚠️ Could not startup BullMQ Worker thread:", e);
}

// Expose main utility for queue inserts
export async function addInterviewToProcessQueue(studentId: number, transcript: string) {
  if (isRedisAvailable && aiAssessmentQueue) {
    try {
      console.log(`📥 Offloading mock assessment for Student #${studentId} to Redis Event Broker...`);
      await aiAssessmentQueue.add("evaluate-session", {
        studentId,
        transcript,
        timestamp: Date.now()
      }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
      });
      return { success: true, mode: "queued" };
    } catch (err) {
      console.error("Queue insert failed, falling back to direct asynchronous process task:", err);
    }
  }

  // Graceful direct-execution asynchronous fallback if Redis is unavailable
  console.log(`🔌 Local fallback: Instantly starting direct evaluation task for Student #${studentId}...`);
  setImmediate(async () => {
    try {
      await processSessionEvaluation({ studentId, transcript });
    } catch (e) {
      console.error("Direct fallback task failed executing context:", e);
    }
  });

  return { success: true, mode: "direct_fallback" };
}
