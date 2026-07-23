import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/authService.ts";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: Insufficient permissions" });
    }
    next();
  };
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied: Admin only" });
  }
  next();
};
