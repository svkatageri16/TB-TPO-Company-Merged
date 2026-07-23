import db from "../db.ts";
import Razorpay from "razorpay";
import crypto from "crypto";

function cleanseEnvValue(val: string): string {
  let cleaned = (val || "").trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

let razorpayClient: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    const keyId = cleanseEnvValue(process.env.RAZORPAY_KEY_ID || "");
    const keySecret = cleanseEnvValue(process.env.RAZORPAY_KEY_SECRET || "");

    if (!keyId || keyId === "rzp_test_your_key_id" || keyId === "your_razorpay_key_id") {
      throw new Error("Razorpay API Key ID is not configured. Please add RAZORPAY_KEY_ID in the environment settings.");
    }
    if (!keySecret || keySecret === "your_key_secret" || keySecret === "your_razorpay_key_secret") {
      throw new Error("Razorpay API Key Secret is not configured. Please add RAZORPAY_KEY_SECRET in the environment settings.");
    }

    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayClient;
}

export const XP_CONFIG = {
  DAILY_REWARD_BASE: 50,
  STREAK_BONUS_STEP: 10,
  REFERRAL_REWARD: 60,
  MOCK_INTERVIEW_COST: 125,
  FREE_MOCK_INITIAL: 3,
};

export class XPService {
  /**
   * Get all dynamic system configurations in a single key-value object
   */
  static async getConfigs() {
    try {
      const [rows]: any = await db.query("SELECT config_key, config_value FROM system_configs");
      const configs: Record<string, number> = {
        DAILY_REWARD_BASE: XP_CONFIG.DAILY_REWARD_BASE,
        STREAK_BONUS_STEP: XP_CONFIG.STREAK_BONUS_STEP,
        REFERRAL_REWARD: XP_CONFIG.REFERRAL_REWARD,
        MOCK_INTERVIEW_COST: XP_CONFIG.MOCK_INTERVIEW_COST,
        RESUME_ANALYSIS_COST: 50,
        QUIZ_QUESTION_COST: 5,
        XP_PER_RUPEE: 5,
        COMMUNITY_POST_XP_REWARD_BASE: 10,
        COMMUNITY_POST_XP_REWARD_HIGH_SCORE: 15,
        COMMUNITY_LIKE_XP_REWARD: 1,
        COMMUNITY_COMMENT_XP_REWARD: 2,
        COMMUNITY_UNLOCK_XP_REWARD: 5,
      };
      if (rows && rows.length > 0) {
        for (const row of rows) {
          configs[row.config_key] = Number(row.config_value);
        }
      }
      return configs;
    } catch (e) {
      console.error("Error fetching system configs:", e);
      return {
        DAILY_REWARD_BASE: XP_CONFIG.DAILY_REWARD_BASE,
        STREAK_BONUS_STEP: XP_CONFIG.STREAK_BONUS_STEP,
        REFERRAL_REWARD: XP_CONFIG.REFERRAL_REWARD,
        MOCK_INTERVIEW_COST: XP_CONFIG.MOCK_INTERVIEW_COST,
        RESUME_ANALYSIS_COST: 50,
        QUIZ_QUESTION_COST: 5,
        XP_PER_RUPEE: 5,
        COMMUNITY_POST_XP_REWARD_BASE: 10,
        COMMUNITY_POST_XP_REWARD_HIGH_SCORE: 15,
        COMMUNITY_LIKE_XP_REWARD: 1,
        COMMUNITY_COMMENT_XP_REWARD: 2,
        COMMUNITY_UNLOCK_XP_REWARD: 5,
      };
    }
  }

  /**
   * Get a specific configuration value
   */
  static async getConfigValue(key: string, defaultValue: number): Promise<number> {
    try {
      const [rows]: any = await db.query("SELECT config_value FROM system_configs WHERE config_key = ?", [key]);
      if (rows && rows.length > 0) {
        return Number(rows[0].config_value);
      }
    } catch (e) {
      console.error(`Error reading config ${key}:`, e);
    }
    return defaultValue;
  }
  /**
   * Add XP to a user's wallet and record transaction
   */
  static async addXP(userId: number, amount: number, type: string, description: string) {
    await db.query(`
      UPDATE users 
      SET xp_balance = xp_balance + ?, 
          total_earned_xp = total_earned_xp + ? 
      WHERE id = ?
    `, [amount, amount, userId]);

    // Sync with performance stats for backwards compatibility
    await db.query(`
      UPDATE student_performance_stats 
      SET xp_points = xp_points + ? 
      WHERE user_id = ?
    `, [amount, userId]);

    await db.query(
      "INSERT INTO xp_transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
      [userId, type, amount, description]
    );
    return true;
  }

  /**
   * Deduct XP from user's wallet
   */
  static async deductXP(userId: number, amount: number, type: string, description: string) {
    const [users]: any = await db.query("SELECT xp_balance FROM users WHERE id = ?", [userId]);
    if (!users || users.length === 0 || users[0].xp_balance < amount) {
      throw new Error("Insufficient XP balance");
    }

    await db.query(`
      UPDATE users 
      SET xp_balance = xp_balance - ?, 
          total_spent_xp = total_spent_xp + ? 
      WHERE id = ?
    `, [amount, amount, userId]);

    // Sync with performance stats
    await db.query(`
      UPDATE student_performance_stats 
      SET xp_points = xp_points - ? 
      WHERE user_id = ?
    `, [amount, userId]);

    await db.query(
      "INSERT INTO xp_transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)",
      [userId, type, -amount, description]
    );
    return true;
  }

  /**
   * Claim daily reward and update streak
   */
  static async claimDailyReward(userId: number) {
    const [users]: any = await db.query(
      "SELECT last_reward_claimed_at, login_streak FROM users WHERE id = ?",
      [userId]
    );
    
    if (!users || users.length === 0) throw new Error("User not found");
    
    const now = new Date();
    const lastClaim = users[0].last_reward_claimed_at ? new Date(users[0].last_reward_claimed_at) : null;
    
    if (lastClaim) {
      const isSameDay = lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
                        lastClaim.getUTCMonth() === now.getUTCMonth() &&
                        lastClaim.getUTCDate() === now.getUTCDate();
      if (isSameDay) {
        throw new Error("Reward already claimed for today. Next claim available tomorrow.");
      }
    }

    // Update streak
    let newStreak = 1;
    if (lastClaim) {
      const diffDays = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 2) { // Allow 48 hours for a streak to continue (flexible)
        newStreak = users[0].login_streak + 1;
      }
    }

    const baseReward = await this.getConfigValue('DAILY_REWARD_BASE', 50);
    const rewardAmount = baseReward;
    
    await this.addXP(userId, rewardAmount, 'DAILY_REWARD', `Daily login reward (Streak: ${newStreak} days)`);
    await db.query(
      "UPDATE users SET last_reward_claimed_at = ?, login_streak = ? WHERE id = ?",
      [now, newStreak, userId]
    );

    return { rewardAmount, newStreak };
  }

  /**
   * Handle referral reward
   */
  static async processReferral(referralCode: string, referredUserId: number) {
    const [referrers]: any = await db.query("SELECT id FROM users WHERE referral_code = ?", [referralCode]);
    if (!referrers || referrers.length === 0) return;

    const referrerId = referrers[0].id;

    // Check if referral record already exists
    const [existing]: any = await db.query(
      "SELECT id FROM referrals WHERE referred_user_id = ?",
      [referredUserId]
    );
    if (existing.length > 0) return;

    await db.query(
      "INSERT INTO referrals (referrer_id, referred_user_id, reward_given) VALUES (?, ?, 1)",
      [referrerId, referredUserId]
    );

    const referralReward = await this.getConfigValue('REFERRAL_REWARD', 60);
    await this.addXP(referrerId, referralReward, 'REFERRAL_REWARD', "Referral bonus for inviting a friend");
  }

  /**
   * Create Razorpay Order
   */
  static async createOrder(userId: number, amount: number, xpAmount: number) {
    try {
      const order = await getRazorpay().orders.create({
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        receipt: `receipt_xp_${userId}_${Date.now()}`,
      });

      await db.query(
        "INSERT INTO payments (user_id, razorpay_order_id, amount, xp_added, status) VALUES (?, ?, ?, ?, 'PENDING')",
        [userId, order.id, amount, xpAmount]
      );

      return order;
    } catch (err: any) {
      console.error("Razorpay Error:", err);
      throw new Error("Payment gateway error: " + (err.message || "Failed to create order"));
    }
  }

  /**
   * Verify Razorpay Payment and credit XP
   */
  static async verifyPayment(
    userId: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    const keySecret = cleanseEnvValue(process.env.RAZORPAY_KEY_SECRET || "your_key_secret");
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      // Find payment record
      const [payments]: any = await db.query(
        "SELECT xp_added FROM payments WHERE razorpay_order_id = ? AND user_id = ?",
        [razorpayOrderId, userId]
      );

      if (payments && payments.length > 0) {
        const xpAmount = payments[0].xp_added;
        await db.query(
          "UPDATE payments SET razorpay_payment_id = ?, status = 'COMPLETED' WHERE razorpay_order_id = ?",
          [razorpayPaymentId, razorpayOrderId]
        );
        await this.addXP(userId, xpAmount, 'XP_PURCHASE', "Purchased XP via Razorpay");
        return true;
      }
    }
    
    await db.query(
      "UPDATE payments SET status = 'FAILED' WHERE razorpay_order_id = ?",
      [razorpayOrderId]
    );
    throw new Error("Payment verification failed");
  }

  /**
   * Check and spend interview credits
   */
  static async spendInterviewCredit(userId: number) {
    const [users]: any = await db.query("SELECT free_mock_count, xp_balance FROM users WHERE id = ?", [userId]);
    if (!users || users.length === 0) throw new Error("User not found");

    const { free_mock_count, xp_balance } = users[0];

    if (free_mock_count > 0) {
      await db.query("UPDATE users SET free_mock_count = free_mock_count - 1 WHERE id = ?", [userId]);
      return { type: 'FREE', remaining: free_mock_count - 1 };
    }

    const interviewCost = await this.getConfigValue('MOCK_INTERVIEW_COST', 125);
    if (xp_balance >= interviewCost) {
      await this.deductXP(userId, interviewCost, 'MOCK_INTERVIEW', "AI Mock Interview Session");
      return { type: 'XP', remaining: xp_balance - interviewCost };
    }

    throw new Error("Insufficient credits or XP balance");
  }
}
