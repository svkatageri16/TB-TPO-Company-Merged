import express from "express";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get settings
router.get("/settings", authenticate, async (req: any, res) => {
  try {
    const [prefs]: any = await db.query(
      "SELECT * FROM accessibility_preferences WHERE user_id = ?",
      [req.user.userId]
    );
    res.json({ success: true, data: prefs[0] || null });
  } catch (e) {
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Update settings
router.post("/settings", authenticate, async (req: any, res) => {
  try {
    const { accessibility_mode, voice_enabled, contrast_mode, font_size, last_used_voice } = req.body;
    
    // Check if exists
    const [exists]: any = await db.query("SELECT id FROM accessibility_preferences WHERE user_id = ?", [req.user.userId]);
    
    if (exists.length > 0) {
      await db.query(
        `UPDATE accessibility_preferences 
         SET accessibility_mode = ?, voice_enabled = ?, contrast_mode = ?, font_size = ?, last_used_voice = ?
         WHERE user_id = ?`,
        [accessibility_mode, voice_enabled, contrast_mode, font_size, last_used_voice, req.user.userId]
      );
    } else {
      await db.query(
        `INSERT INTO accessibility_preferences 
         (user_id, accessibility_mode, voice_enabled, contrast_mode, font_size, last_used_voice)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.userId, accessibility_mode, voice_enabled, contrast_mode, font_size, last_used_voice]
      );
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Log voice command
router.post("/log-command", authenticate, async (req: any, res) => {
  try {
    const { command, intent, confidence, success } = req.body;
    await db.query(
      "INSERT INTO voice_command_logs (user_id, command, intent, confidence, success) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, command, intent, confidence, success]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Database error" });
  }
});

export default router;
