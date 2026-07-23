import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "vega_secure_prod_secret_998877";
export const REFRESH_SECRET = process.env.REFRESH_SECRET || "vega_refresh_prod_secret_112233";

export function generateToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" }); // Increased to 24h for stable development
}

export function generateRefreshToken(payload: any) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" }); // Long-lived refresh token
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (e) {
    return null;
  }
}
