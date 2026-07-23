import express from "express";
import { authenticate } from "../middleware/auth.ts";
import { XPService } from "../services/xpService.ts";
import { updateDailyTask } from "../services/analyticsService.ts";
import db from "../db.ts";

const router = express.Router();

// Get XP balance and status
router.get("/balance", authenticate, async (req: any, res) => {
  try {
    const [users]: any = await db.query(
      "SELECT xp_balance, free_mock_count, login_streak, last_reward_claimed_at, referral_code, total_earned_xp, total_spent_xp FROM users WHERE id = ?",
      [req.user.userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const configs = await XPService.getConfigs();
    res.json({ success: true, balance: users[0], configs });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ success: false, message: "Error fetching balance: " + (error as Error).message });
  }
});

// Get transaction history
router.get("/transactions", authenticate, async (req: any, res) => {
  try {
    const [transactions]: any = await db.query(
      "SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.userId]
    );
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching transactions" });
  }
});

// Claim daily reward
router.post("/claim-daily", authenticate, async (req: any, res) => {
  try {
    // 1. Mark as completed in daily tasks for analytics
    await updateDailyTask(req.user.userId, 'CHECK_IN');
    
    // 2. Use XPService to handle transaction, streak and xp balance
    const result = await XPService.claimDailyReward(req.user.userId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create Razorpay Order
router.post("/purchase/order", authenticate, async (req: any, res) => {
  const { amount, xpAmount } = req.body;
  try {
    const order = await XPService.createOrder(req.user.userId, amount, xpAmount);
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Error creating order" });
  }
});

// Verify Payment
router.post("/purchase/verify", authenticate, async (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  try {
    await XPService.verifyPayment(
      req.user.userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    res.json({ success: true, message: "Payment verified and XP credited" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get dynamic XP packages configured by admin
router.get("/packages", authenticate, async (req: any, res) => {
  try {
    const [packages]: any = await db.query(
      "SELECT id, name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included FROM xp_packages ORDER BY price_inr ASC"
    );
    res.json({ success: true, packages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ success: false, message: "Error fetching packages" });
  }
});

// Get referral stats
router.get("/referrals", authenticate, async (req: any, res) => {
  try {
    const [referrals]: any = await db.query(
      `SELECT r.*, u.email as referred_email 
       FROM referrals r 
       JOIN users u ON r.referred_user_id = u.id 
       WHERE r.referrer_id = ?`,
      [req.user.userId]
    );
    
    res.json({ success: true, referrals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching referrals" });
  }
});

// Verify if user can start a mock interview
router.post("/verify-interview", authenticate, async (req: any, res) => {
  try {
    const [users]: any = await db.query(
      "SELECT free_mock_count, xp_balance FROM users WHERE id = ?",
      [req.user.userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { free_mock_count, xp_balance } = users[0];
    const mockCost = await XPService.getConfigValue('MOCK_INTERVIEW_COST', 125);
    if (free_mock_count > 0 || xp_balance >= mockCost) {
      res.json({ success: true, method: free_mock_count > 0 ? 'FREE' : 'XP' });
    } else {
      res.status(403).json({ success: false, message: "INSUFFICIENT_CREDITS" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deduct cost after interview starts
router.post("/deduct-interview", authenticate, async (req: any, res) => {
  try {
    await XPService.spendInterviewCredit(req.user.userId);
    res.json({ success: true, message: "Credit deducted" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
