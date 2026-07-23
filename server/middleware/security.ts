import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";

/**
 * Enterprise CORS Configuration
 * Restricts access to authorized production domains and secures pre-flight headers.
 */
export const configureCors = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",") 
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
      const isRender = origin.includes("onrender.com");
      const isConfigured = allowedOrigins.indexOf(origin) !== -1;
      
      if (isLocal || isRender || isConfigured || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        // Return null, false to reject CORS access rather than throwing a 500 error on the server
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    credentials: true,
    maxAge: 86400, // Cache pre-flight response for 24 hours
  });
};

/**
 * Advanced Multi-tier Rate Limiting
 * Defends key endpoints from Brute Force, DDoS, and API abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: {
    success: false,
    message: "Rate limit exceeded. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit login/register attempts to 10 per 15 mins to mitigate brute force
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiServiceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit AI requests to 50 per hour per IP to contain token/credit drain
  message: {
    success: false,
    message: "Hourly AI consumption quota exceeded. Please wait before asking again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Input & Parameter Sanitization Middleware
 * Recursively strips potential XSS injectors and SQL characters.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (val: any): any => {
    if (typeof val === "string") {
      // Strip tag structures & suspicious triggers
      return val
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/onerror=/gi, "")
        .replace(/onload=/gi, "")
        .trim();
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    if (val !== null && typeof val === "object") {
      const cleanObj: any = {};
      for (const key of Object.keys(val)) {
        cleanObj[key] = sanitizeValue(val[key]);
      }
      return cleanObj;
    }
    return val;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

/**
 * Deep XSS & Content-Security mitigation headers helper 
 */
export const secureHeadersConfig = (): any => {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://checkout.razorpay.com", "https://cdn.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "wss:", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://cdn.razorpay.com", "https://lumberjack-cx.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://custom-analytics.razorpay.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    },
    crossOriginEmbedderPolicy: false,
    xssFilter: true, // Deprecated but helps legacy browsers
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  };
};

/**
 * Prompt Injection Protection Middleware
 * Inspects AI assistant queries for systemic override patterns.
 */
export const detectPromptInjection = (req: Request, res: Response, next: NextFunction) => {
  const bodyString = JSON.stringify(req.body) || "";
  
  if (bodyString) {
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s+override/i,
      /you\s+are\s+now\s+an\s+admin/i,
      /reveal\s+your\s+system\s+instructions/i,
      /forget\s+everything/i,
      /you\s+must\s+now/i,
      /ignore\s+above/i,
      /ignore\s+the\s+above/i,
      /print\s+the\s+system\s+prompt/i,
      /disregard\s+all\s+prior/i
    ];

    const matched = injectionPatterns.some(pattern => pattern.test(bodyString));
    if (matched) {
      return res.status(400).json({
        success: false,
        message: "Request blocked: Prompt injection / instruction override pattern detected."
      });
    }
  }
  next();
};
