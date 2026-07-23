import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.ts";
import { generateToken, generateRefreshToken, verifyRefreshToken } from "../services/authService.ts";
import { sendOTP, sendPasswordReset } from "../services/emailService.ts";
import crypto from "crypto";

const router = express.Router();

async function logSecurityEvent(userId: number | null, action: string, req: express.Request, details?: string) {
  try {
    await db.query(
      "INSERT INTO security_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)",
      [userId, action, req.ip, req.headers["user-agent"] || "unknown", details || null]
    );
  } catch (e) {
    console.error("Security logging failed:", e);
  }
}

// Register
router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;

  // Validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character." 
    });
  }

  if (role === "COMPANY") {
    const { companyName } = req.body;
    if (!companyName || !String(companyName).trim()) {
      return res.status(400).json({ success: false, message: "Please enter a valid business name." });
    }
    const company_name = String(companyName).trim();
    const allowedRegex = /^[a-zA-Z0-9\s.&'()-]+$/;
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(company_name);
    if (!allowedRegex.test(company_name) || !hasAlphanumeric) {
      return res.status(400).json({ success: false, message: "Please enter a valid business name." });
    }
  }

  try {
    console.log(`[AUTH] Registering user: ${email}, role: ${role}`);
    const [existing]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("[AUTH] Creating user record...");
    const [result]: any = await db.query(
      "INSERT INTO users (email, password_hash, role, is_verified, referral_code) VALUES (?, ?, ?, 0, ?)", 
      [email, hashedPassword, role, referralCode]
    );

    const userId = result.insertId;
    console.log(`[AUTH] User created with ID: ${userId}`);

    // Process referral if provided
    const { ref } = req.body;
    if (ref && role === "STUDENT") {
      const { XPService } = await import("../services/xpService.ts");
      await XPService.processReferral(ref, userId);
    }

    // Create profile stub
    if (role === "STUDENT") {
      console.log("[AUTH] Creating student profile stub...");
      const tbId = `TB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      await db.query(
        "INSERT INTO student_profiles (user_id, tb_id, profile_visibility) VALUES (?, ?, 'PUBLIC')",
        [userId, tbId]
      );
      // Ensure sync insert for student_visibility as well
      await db.query(
        "INSERT INTO student_visibility (student_id, visibility) SELECT id, 'PUBLIC' FROM student_profiles WHERE user_id = ?",
        [userId]
      );
      await db.query("INSERT INTO student_performance_stats (user_id, xp_points, last_active_at, current_streak) VALUES (?, 0, CURRENT_TIMESTAMP, 1)", [userId]);
      
      const { XPService } = await import("../services/xpService.ts");
      await XPService.addXP(userId, 200, "BONUS", "Welcome Bonus Points");
    } else if (role === "COMPANY") {
      const { companyName } = req.body;
      console.log(`[AUTH] Creating company profile stub for: ${companyName}`);
      await db.query("INSERT INTO company_profiles (user_id, company_name) VALUES (?, ?)", [userId, companyName || "New Company"]);
    }

    // Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await db.query("DELETE FROM otps WHERE email = ?", [email]);
    await db.query("INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)", [email, otp, expiresAt]);
    
    console.log(`[AUTH] Registration OTP for ${email}: ${otp}. Expires at: ${expiresAt.toISOString()}`);
    
    // Send email asynchronously and fire and forget
    sendOTP(email, otp).catch(err => {
      console.error(`[AUTH] Failed to send registration email to ${email}. OTP is ${otp}`, err);
    });

    await logSecurityEvent(userId, "REGISTER", req);

    res.status(201).json({ 
      success: true, 
      message: "Registration successful. Please verify your email with the OTP sent.",
      userId,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error("[AUTH] Registration Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Registration failed", 
      error: String(error),
      stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];

    if (!user) {
      await logSecurityEvent(null, "LOGIN_FAILED", req, `Email: ${email}`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ success: false, message: "Account is temporarily locked due to multiple failed attempts. Try again later." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const attempts = user.failed_login_attempts + 1;
      let updateQuery = "UPDATE users SET failed_login_attempts = ? WHERE id = ?";
      let params = [attempts, user.id];

      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        updateQuery = "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?";
        params = [attempts, lockUntil, user.id];
      }
      
      await db.query(updateQuery, params);
      await logSecurityEvent(user.id, "LOGIN_FAILED_ATTEMPT", req);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Reset failed attempts
    await db.query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", [user.id]);

    if (!user.is_verified) {
      return res.status(403).json({ success: false, message: "Email not verified.", requiresVerification: true });
    }

    const accessToken = generateToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [user.id, refreshToken, refreshExpiresAt]);

    let profileData: any = null;
    let requiresPasswordChange = false;
    let sidebarPermissions: string[] | null = null;

    if (user.role === "STUDENT") {
      const [profiles]: any = await db.query(
        `SELECT sp.*, COALESCE(sp.college_id, b.college_id) as actual_college_id, 
                COALESCE(b.batch_name, sp.batch) as actual_batch_name, 
                cm.college_name 
         FROM student_profiles sp 
         LEFT JOIN student_batch sb ON sp.id = sb.student_id 
         LEFT JOIN batches b ON COALESCE(sp.batch_id, sb.batch_id) = b.id 
         LEFT JOIN college_master cm ON COALESCE(sp.college_id, b.college_id) = cm.id 
         WHERE sp.user_id = ?`, 
        [user.id]
      );
      profileData = profiles[0];
      if (profileData) {
        profileData.college_id = profileData.actual_college_id || profileData.college_id;
        profileData.batch_name = profileData.actual_batch_name || profileData.batch || '';
        profileData.batch = profileData.actual_batch_name || profileData.batch || '';
      }
    } else if (user.role === "COMPANY") {
      const [hrProfiles]: any = await db.query("SELECT * FROM company_hr_profiles WHERE user_id = ?", [user.id]);
      if (hrProfiles && hrProfiles.length > 0) {
        const hr = hrProfiles[0];
        const [companies]: any = await db.query("SELECT * FROM company_profiles WHERE id = ?", [hr.company_id]);
        const company = companies[0];
        profileData = {
          ...company,
          id: hr.company_id,
          isSubHr: true,
          hr_profile_id: hr.id,
          designation: hr.designation,
          permissions: JSON.parse(hr.permissions || "[]"),
          role_type: hr.role_type
        };
      } else {
        const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [user.id]);
        profileData = profiles[0];
        if (profileData) {
          profileData.isSubHr = false;
        }
      }
    } else if (user.role === "TPO") {
      const [profiles]: any = await db.query("SELECT * FROM tpo_profiles WHERE user_id = ?", [user.id]);
      profileData = profiles[0];
      if (profileData && profileData.first_login === 1) {
        requiresPasswordChange = true;
      }
    }

    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      try {
        const [perms]: any = await db.query("SELECT allowed_pages FROM admin_sidebar_permissions WHERE user_id = ?", [user.id]);
        if (perms && perms.length > 0) {
          sidebarPermissions = JSON.parse(perms[0].allowed_pages);
        }
      } catch (e) {
        console.error("Error loading sidebar permissions:", e);
      }
    }

    await logSecurityEvent(user.id, "LOGIN_SUCCESS", req);

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          is_verified: user.is_verified,
          sidebarPermissions
        },
        profile: profileData,
        requiresPasswordChange
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Refresh Token
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: "Refresh token required" });

  try {
    const payload: any = verifyRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ success: false, message: "Invalid refresh token" });

    const [stored]: any = await db.query("SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?", [refreshToken, payload.userId]);
    if (stored.length === 0 || new Date(stored[0].expires_at) < new Date()) {
       return res.status(401).json({ success: false, message: "Token expired or revoked" });
    }

    const [users]: any = await db.query("SELECT * FROM users WHERE id = ?", [payload.userId]);
    const user = users[0];

    const newAccessToken = generateToken({ userId: user.id, role: user.role, email: user.email });
    res.json({ success: true, token: newAccessToken });
  } catch (e) {
    res.status(500).json({ success: false, message: "Refresh failed" });
  }
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    const [users]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }

    await db.query("DELETE FROM otps WHERE email = ?", [email]);
    await db.query("INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)", [email, otp, expiresAt]);
    
    console.log(`[AUTH] Resending OTP for ${email}: ${otp}. Expires at: ${expiresAt.toISOString()}`);
    
    sendOTP(email, otp).catch(err => {
      console.error(`[AUTH] Failed to send OTP email to ${email}. Verification code is ${otp}`, err);
    });
    
    res.json({ 
      success: true, 
      message: "A new verification code has been sent to your email.",
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined 
    });
  } catch (e) {
    console.error("Resend OTP Error:", e);
    res.status(500).json({ success: false, message: "Failed to send OTP due to a server error." });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  try {
    const [otps]: any = await db.query("SELECT * FROM otps WHERE email = ? AND code = ?", [email, code]);
    const record = otps[0];

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check and try again." });
    }

    // Check expiry
    const now = new Date();
    let expiryDate: Date;

    if (record.expires_at instanceof Date) {
      expiryDate = record.expires_at;
    } else {
      // Handle string format from DB
      const dateStr = String(record.expires_at);
      // If it looks like '2026-05-06 05:43:53', it lacks 'T' and 'Z'
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        expiryDate = new Date(dateStr.replace(' ', 'T') + 'Z');
      } else if (!dateStr.includes('Z') && !dateStr.includes('+')) {
        expiryDate = new Date(dateStr + 'Z');
      } else {
        expiryDate = new Date(dateStr);
      }
    }

    if (isNaN(expiryDate.getTime()) || expiryDate < now) {
      console.log(`[AUTH] OTP Expired. Now: ${now.toISOString()}, Expiry: ${expiryDate.toISOString()}`);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    await db.query("UPDATE users SET is_verified = 1 WHERE email = ?", [email]);
    await db.query("DELETE FROM otps WHERE email = ?", [email]);
    
    const [users]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (users[0]) await logSecurityEvent(users[0].id, "EMAIL_VERIFIED", req);

    res.json({ success: true, message: "Email verified successfully. You can now login." });
  } catch (e) {
    console.error("OTP Verification Error:", e);
    res.status(500).json({ success: false, message: "Verification failed due to a server error." });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const [tokens]: any = await db.query("SELECT user_id FROM refresh_tokens WHERE token = ?", [refreshToken]);
      if (tokens.length > 0) {
        const userId = tokens[0].user_id;
        // The user specifically requested to delete the chat history upon logout
        await db.query("DELETE FROM ai_conversations WHERE user_id = ?", [userId]);
      }
      await db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
    } catch (e: any) {
      console.error("Error during logout cleanup:", e.message);
    }
  }
  res.json({ success: true, message: "Logged out" });
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const [users]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(5).toString("hex"); // 10 characters to fit VARCHAR(10)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query("DELETE FROM otps WHERE email = ?", [email]);
    await db.query("INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)", [email, token, expiresAt]);

    const resetLink = `${req.headers.origin}/reset-password?token=${token}&email=${email}`;
    sendPasswordReset(email, resetLink).catch(err => console.error("Forgot pass email err:", err));

    res.json({ 
      success: true, 
      message: "Reset link sent successfully.",
      resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined 
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    res.status(500).json({ success: false, message: "Failed to initiate reset" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  try {
    const [otps]: any = await db.query("SELECT * FROM otps WHERE email = ? AND code = ?", [email, token]);
    if (otps.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid reset token." });
    }

    let expiryDate = new Date(otps[0].expires_at);
    if (typeof otps[0].expires_at === 'string' && !otps[0].expires_at.includes('Z') && !otps[0].expires_at.includes('+')) {
      expiryDate = new Date(otps[0].expires_at.replace(' ', 'T') + 'Z');
    }

    if (isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
      return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE email = ?", [hashedPassword, email]);
    await db.query("DELETE FROM otps WHERE email = ?", [email]);

    const [users]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (users[0]) await logSecurityEvent(users[0].id, "PASSWORD_RESET", req);

    res.json({ success: true, message: "Password reset successfully." });
  } catch (e) {
    res.status(500).json({ success: false, message: "Refresh failed" });
  }
});

// Change Password (for first login or manual change)
router.post("/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const [users]: any = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    const user = users[0];

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Validate current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: "Incorrect current password" });

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character." 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedNewPassword, userId]);

    // If TPO, mark first_login as 0
    if (user.role === 'TPO') {
      await db.query("UPDATE tpo_profiles SET first_login = 0 WHERE user_id = ?", [userId]);
    }

    await logSecurityEvent(userId, "PASSWORD_CHANGE", req);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error changing password" });
  }
});

export default router;
