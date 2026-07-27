import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sanitizeInput, detectPromptInjection, strictAuthLimiter, apiLimiter, configureCors, aiServiceLimiter, secureHeadersConfig } from "./server/middleware/security.ts";

// Initialize DB
import { initDb } from "./server/db.ts";

// Import Routes
import authRoutes from "./server/routes/auth.ts";
import studentRoutes from "./server/routes/student.ts";
import companyRoutes from "./server/routes/company.ts";
import jobRoutes from "./server/routes/job.ts";
import aiRoutes from "./server/routes/ai.ts";
import adminRoutes from "./server/routes/admin.ts";
import tpoRoutes from "./server/routes/tpo.ts";
import resumeRoutes from "./server/routes/resume.ts";
import analyticsRoutes from "./server/routes/analytics.ts";
import psychometricRoutes from "./server/routes/psychometric.ts";
import accessibilityRoutes from "./server/routes/accessibility.ts";
import xpRoutes from "./server/routes/xp.ts";
import quizRoutes from "./server/routes/quiz.ts";
import codingRoutes from "./server/routes/coding.ts";
import chatbotRoutes from "./server/routes/chatbot.ts";
import intelligenceRoutes from "./server/routes/intelligence.ts";
import communityRoutes from "./server/routes/community.ts";
import careerGapRoutes from "./server/routes/careerGap.ts";
import interviewRoutes from "./server/routes/interview.ts";
import assessmentRoutes from "./server/routes/assessments.ts";

async function startServer() {
  const app = express();
  
  // Enable trusting proxy headers (necessary for express-rate-limit and reverse-proxies)
  app.set("trust proxy", 1);
  
  // Security Headers
  if (process.env.NODE_ENV === "production") {
    app.use(helmet(secureHeadersConfig()));
  } else {
    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for local dev/iframe to avoid blocking AI viewports
      crossOriginEmbedderPolicy: false
    }));
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(configureCors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  
  // Apply Input and Parameter Sanitization (OWASP A03 / XSS Mitigation)
  app.use(sanitizeInput);

  // Apply general API Throttling Rate Limiting
  app.use("/api", apiLimiter);
  
  // Apply strict Brute Force Rate Limiting exclusively to authentication endpoints
  app.use("/api/auth", strictAuthLimiter);

  // Apply Prompt Injection protection and Cost-limiting filters on AI/LLM interfaces
  app.use("/api/ai", aiServiceLimiter, detectPromptInjection);
  app.use("/api/chatbot", aiServiceLimiter, detectPromptInjection);

  // Hardened serving of /uploads preventing RCE, content injection, and script execution
  app.use("/uploads", (req, res, next) => {
    // Block direct static access to Company Drop uploads (must be fetched via status-aware media API)
    if (req.path.startsWith("/drops") || req.path.startsWith("drops")) {
      return res.status(403).json({ error: "Access denied. Drop media must be accessed through secure media endpoints." });
    }

    const ext = path.extname(req.path).toLowerCase();
    const bannedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.sh', '.bash', '.php', '.exe', '.bat', '.cmd', '.py', '.pl', '.html', '.htm', '.jsp', '.asp', '.aspx', '.json'];
    if (bannedExtensions.includes(ext)) {
      return res.status(403).json({ error: "Access denied. Action blocked by container safety policy." });
    }
    
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  }, express.static("uploads"));

  if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
  }

  // Initialize Database
  await initDb();

  // Run Job expiry background checks on startup and periodically (every 5 minutes)
  try {
    const { checkAndProcessJobExpirations } = await import("./server/services/jobExpiryService.ts");
    checkAndProcessJobExpirations().catch(err => console.error("Error on initial job expiry check:", err));
    setInterval(() => {
      checkAndProcessJobExpirations().catch(err => console.error("Error in job expiry background check:", err));
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Failed to load or start job expiry background checker:", err);
  }

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/companies", companyRoutes);
  app.use("/api/company", companyRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/tpo", tpoRoutes);
  app.use("/api/resume", resumeRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/psychometric", psychometricRoutes);
  app.use("/api/accessibility", accessibilityRoutes);
  app.use("/api/xp", xpRoutes);
  app.use("/api/quiz", quizRoutes);
  app.use("/api/coding", codingRoutes);
  app.use("/api/chatbot", chatbotRoutes);
  app.use("/api/intelligence", intelligenceRoutes);
  app.use("/api/community", communityRoutes);
  app.use("/api/career-gap", careerGapRoutes);
  app.use("/api/interviews", interviewRoutes);
  app.use("/api/assessments", assessmentRoutes);

  // WebSocket for AI Mock Interview
  const { setupInterviewSocket } = await import("./server/sockets/interview.ts");
  setupInterviewSocket(io);

  // WebSocket for WebRTC Live Interview
  const { setupWebRTCInterviewSocket } = await import("./server/sockets/webrtc-interview.ts");
  setupWebRTCInterviewSocket(io);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      optimizeDeps: {
        force: true
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // Do not return index.html for API endpoints, assets, or paths with extensions
      if (req.path.startsWith("/api") || req.path.startsWith("/assets") || req.path.includes(".")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 VEGA Server running on http://localhost:${PORT}`);
  });
}

startServer();
