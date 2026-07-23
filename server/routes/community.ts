import express from "express";
import db from "../db.ts";
import { authenticate } from "../middleware/auth.ts";
import { XPService } from "../services/xpService.ts";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

// Initialize Gemini SDK safely if key is available
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper to parse base64 data URLs
function parseBase64DataUrl(dataUrl: string) {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) return null;
  return {
    mimeType: matches[1],
    base64Data: matches[2],
  };
}

/**
 * Endpoint to analyze attached media (images and videos) in real-time
 * while a student is composing a post or a blog.
 */
router.post("/posts/validate-media", authenticate, async (req: any, res) => {
  const { media_url, media_type } = req.body;

  if (!media_url) {
    return res.status(400).json({ success: false, message: "Missing media URL or data payload" });
  }

  const parsed = parseBase64DataUrl(media_url);
  if (!parsed) {
    return res.status(400).json({ success: false, message: "Invalid media payload format" });
  }

  if (!ai) {
    // If Gemini is not set up, default to success to not block user workflow
    return res.json({
      success: true,
      is_appropriate: true,
      reason: "",
    });
  }

  try {
    const promptText = `
    Analyze this student-provided ${media_type || "image/video"} attachment for a placement and career preparation community portal.
    Your goal is to detect if this media is appropriate, professional, positive, and correct.

    It is considered INAPPROPRIATE or NEGATIVE if:
    1. It contains inappropriate non-professional content (e.g. random non-academic memes, family rants, personal visual spam).
    2. It depicts violence, profanity, drugs, personal social-media selfies unrelated to education or career success.
    3. It contains toxic text overlay, negative rants, or off-topic imagery.

    Evaluate carefully first and then output a JSON object.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.base64Data,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_appropriate: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["is_appropriate", "reason"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      is_appropriate: result.is_appropriate ?? true,
      reason: result.reason || "",
    });
  } catch (err: any) {
    console.error("Gemini media validation failed:", err);
    return res.json({
      success: true,
      is_appropriate: true,
      reason: "Could not fully analyse media, allowed as fallback.",
    });
  }
});

/**
 * Endpoint to analyze the entire post (title, content, type, image_url, video_url)
 * for correctness, positive sentiment, and educational alignment before submit.
 */
router.post("/posts/validate", authenticate, async (req: any, res) => {
  const { title, content, type, image_url, video_url } = req.body;

  if (!title || !content || !type) {
    return res.status(400).json({ success: false, message: "Required fields missing for validation" });
  }

  if (!ai) {
    // Fallback if AI gets disabled
    return res.json({
      success: true,
      is_positive_and_correct: true,
      warning_reason: "",
      suggestions: "",
    });
  }

  try {
    const parts: any[] = [];
    const promptText = `
    You are an expert student placement board administrator.
    Inspect the following student post for correctness, professional positivity, and alignment with academic/career preparation goals.

    Proposed Post Details:
    Post Type: ${type}
    Title: ${title}
    Content: ${content}

    Highly Encourage & Approve (is_positive_and_correct = true):
    1. Positive blog posts, platform reviews, motivational write-ups, or success stories sharing how helpful the learning tools or communities are.
    2. Technical guides, coding tutorials, interview preparation, interview experiences, target company guides, and resume advice.
    3. Constructive feedback that aims to help fellow students or improve learning strategies.

    Reject (is_positive_and_correct = false) ONLY if:
    1. It is a toxic rant, abusive, aggressive, harassing, filled with profanity, or cyber-bullying.
    2. It depicts extremely depressing or hopeless defeatist rants that demotivate peers without any learning or constructive goals.
    3. It is off-topic spam, trolling, personal social media selfies, or commercial advertisements.
    4. Visual attachments (if provided below) show inappropriate, violent, or non-educational content.

    Provide constructive suggestions for alignment with career development.
    `;

    parts.push({ text: promptText });

    if (image_url) {
      const parsedImage = parseBase64DataUrl(image_url);
      if (parsedImage) {
        parts.push({ text: "Attached Image Draft File for visual sentiment and content check:" });
        parts.push({
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.base64Data,
          },
        });
      }
    }

    if (video_url) {
      const parsedVideo = parseBase64DataUrl(video_url);
      if (parsedVideo) {
        parts.push({ text: "Attached Video Draft File for visual sentiment and content check:" });
        parts.push({
          inlineData: {
            mimeType: parsedVideo.mimeType,
            data: parsedVideo.base64Data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_positive_and_correct: { type: Type.BOOLEAN },
            warning_reason: { type: Type.STRING },
            suggestions: { type: Type.STRING },
          },
          required: ["is_positive_and_correct", "warning_reason", "suggestions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      is_positive_and_correct: result.is_positive_and_correct ?? true,
      warning_reason: result.warning_reason || "",
      suggestions: result.suggestions || "",
    });
  } catch (err: any) {
    console.error("Gemini post validate failed:", err);
    return res.json({
      success: true,
      is_positive_and_correct: true,
      warning_reason: "",
      suggestions: "Proceed via fallback validation bypass.",
    });
  }
});

/**
 * 📝 CREATE POST
 * Supports auto preview, scoring, and tag categorization via Gemini
 */
router.post("/posts", authenticate, async (req: any, res) => {
  const {
    type,
    title,
    content,
    xp_unlock_cost = 0,
    company_name = null,
    author_role = "STUDENT",
    author_badge = null,
    proof_url = null,
    tags: userProvidedTags = "",
    image_url = null,
    video_url = null,
  } = req.body;

  if (!title || !content || !type) {
    return res.status(400).json({ success: false, message: "Missing required fields (title, content, type)" });
  }

  const userId = req.user.userId;

  let previewText = "";
  let contentScore = 80;
  let computedTags = "";
  let qualityAnalysis = "";

  // 1. Invoke Gemini AI Context Analyzer if available
  if (ai) {
    try {
      const analysisPrompt = `
      You are an expert technical editor and career placement head. Analyze the following user post and output a JSON analysis.
      
      Post Type: ${type}
      Post Title: ${title}
      Post Content: ${content}

      Safety and Sentiment Check Rules:
      Ensure this post is constructive, professional, and positive for career preparation.
      
      Highly Encourage & Approve (is_positive_and_correct = true):
      1. Genuine positive platform reviews, success testimonials, motivational logs, or study journey trackers.
      2. Comprehensive interview blogs, code snippets, DSA concepts, and industry insights.

      Reject (is_positive_and_correct = false) ONLY if:
      - It contains toxic, abusive, hostile, offensive language, or harassing content.
      - It contains hopeless negative rants or trolling that adds zero professional value.
      - It is off-topic spam unrelated to professional career development or engineering.

      Generate:
      1. is_positive_and_correct (boolean): false if user is posting negative or inappropriate content, true otherwise.
      2. warning_reason (string): polite warning message describing what is negative or inappropriate if is_positive_and_correct is false (empty if true).
      3. A preview_text (15-20 words ending in "..."). It must be an extremely catchy tension hooks line that triggers human curiosity, usually showing the start of a struggle or key lesson, then blurs out (ends with '...').
      4. A content_score (integer between 50 and 100) based on educational value, technical accuracy, and readability.
      5. Comma-separated tags (maximum 4 tags, e.g., "DSA, Backend, AWS, Interview Tips").
      6. A one-sentence praise or suggestion analysis indicating technical depth or value.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_positive_and_correct: { type: Type.BOOLEAN },
              warning_reason: { type: Type.STRING },
              preview_text: { type: Type.STRING },
              content_score: { type: Type.INTEGER },
              tags: { type: Type.STRING },
              analysis: { type: Type.STRING },
            },
            required: ["is_positive_and_correct", "warning_reason", "preview_text", "content_score", "tags", "analysis"],
          },
        },
      });

      const body = JSON.parse(response.text || "{}");
      if (body.is_positive_and_correct === false) {
        return res.status(400).json({ 
          success: false, 
          message: body.warning_reason || "Your post was detected as negative or containing inappropriate content. Please write a constructive, positive and career-oriented post."
        });
      }

      previewText = body.preview_text || "";
      contentScore = body.content_score || 80;
      computedTags = body.tags || "";
      qualityAnalysis = body.analysis || "";
    } catch (err) {
      console.error("Gemini analysis failed, running fallback...", err);
    }
  }

  // 2. Gracious Fallback if AI was unavailable or failed
  if (!previewText) {
    previewText = content.slice(0, 100).trim() + "...";
  }
  if (!computedTags) {
    if (userProvidedTags) {
      computedTags = userProvidedTags;
    } else {
      const tags: string[] = [];
      const lower = (title + " " + content).toLowerCase();
      if (lower.includes("dsa") || lower.includes("leetcode") || lower.includes("algorithm")) tags.push("DSA");
      if (lower.includes("react") || lower.includes("frontend") || lower.includes("javascript")) tags.push("Frontend");
      if (lower.includes("node") || lower.includes("backend") || lower.includes("mysql") || lower.includes("spring")) tags.push("Backend");
      if (lower.includes("interview") || lower.includes("infosys") || lower.includes("crack")) tags.push("Interview Tips");
      if (lower.includes("resume") || lower.includes("cv")) tags.push("Resume");
      if (lower.includes("aws") || lower.includes("cloud") || lower.includes("docker")) tags.push("DevOps");
      if (tags.length === 0) tags.push("Career Prep");
      computedTags = tags.join(", ");
    }
  }
  if (!qualityAnalysis) {
    qualityAnalysis = "Great career experience post shared with the VEGA community.";
  }

  // Determine pricing defaults based on type if xp_unlock_cost is not custom
  let finalUnlockCost = Number(xp_unlock_cost);
  if (finalUnlockCost === 0 || isNaN(finalUnlockCost)) {
    if (type === "Short Experience") finalUnlockCost = 10;
    else if (type === "Premium Blog") finalUnlockCost = 25;
    else if (type === "Company Preparation Guide") finalUnlockCost = 40;
    else if (type === "Full Placement Journey") finalUnlockCost = 50;
  }

  try {
    const [result]: any = await db.query(
      `
      INSERT INTO posts (
        user_id, type, title, content, preview_text, xp_unlock_cost, 
        company_name, author_role, author_badge, content_score, 
        quality_analysis, tags, proof_url, image_url, video_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        type,
        title,
        content,
        previewText,
        finalUnlockCost,
        company_name,
        author_role,
        author_badge || (author_role === "STUDENT" ? "Placed Student" : "Mentor"),
        contentScore,
        qualityAnalysis,
        computedTags,
        proof_url,
        image_url,
        video_url,
      ]
    );

    // Reward creator a small bonus XP for posting high quality content
    const baseReward = await XPService.getConfigValue("COMMUNITY_POST_XP_REWARD_BASE", 10);
    const highscoreReward = await XPService.getConfigValue("COMMUNITY_POST_XP_REWARD_HIGH_SCORE", 15);
    const bonusPostXP = contentScore >= 90 ? highscoreReward : baseReward;
    await XPService.addXP(userId, bonusPostXP, "BONUS", `[Community] Incentive reward for publishing article: "${title}"`);

    res.json({
      success: true,
      message: "Post published successfully!",
      postId: result.insertId,
      xpRewarded: bonusPostXP,
      aiAnalysis: {
        previewText,
        contentScore,
        tags: computedTags,
        analysis: qualityAnalysis,
      },
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    res.status(500).json({ success: false, message: "Error saving community post: " + error.message });
  }
});

router.get("/events", authenticate, async (req: any, res) => {
  try {
    const [events]: any = await db.query(`
      SELECT e.*, cm.college_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count
      FROM events e
      LEFT JOIN college_master cm ON e.college_id = cm.id
      ORDER BY e.start_date DESC
    `);
    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error("Error fetching community events:", error);
    res.status(500).json({ success: false, message: "Error fetching community events: " + error.message });
  }
});

router.post("/events/register/:id", authenticate, async (req: any, res) => {
  const currentUserId = req.user.userId;
  const eventId = req.params.id;

  try {
    const [students]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [currentUserId]);
    if (!students || students.length === 0) {
      return res.status(400).json({ success: false, message: "Student profile not found" });
    }
    const studentId = students[0].id;

    const [existing]: any = await db.query(
      "SELECT * FROM event_registrations WHERE event_id = ? AND student_id = ?",
      [eventId, studentId]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: "You are already registered for this event" });
    }

    await db.query(
      "INSERT INTO event_registrations (event_id, student_id) VALUES (?, ?)",
      [eventId, studentId]
    );

    res.json({ success: true, message: "Registered for event successfully" });
  } catch (err: any) {
    console.error("Error registering for event:", err);
    res.status(500).json({ success: false, message: "Error registering for event: " + err.message });
  }
});

/**
 * 📱 GET RELEVANT RECOMMENDATION FEED
 * Support skills matching, search parameters, company terms, and follows
 */
router.get("/feed", authenticate, async (req: any, res) => {
  const currentUserId = req.user.userId;
  const { type, tag, company, is_verified, author_role, search, personal_only } = req.query;

  try {
    // A. Feed Query construction supporting relational information
    let sql = `
      SELECT 
        p.*,
        u.email as creator_email,
        sp.full_name as student_name,
        sp.profile_photo_url as student_photo,
        cp.company_name as corp_name,
        cp.logo_url as corp_photo,
        (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) as likes,
        (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) as has_liked,
        (SELECT COUNT(*) FROM post_bookmarks b WHERE b.post_id = p.id AND b.user_id = ?) as has_bookmarked,
        (SELECT COUNT(*) FROM unlocked_posts up WHERE up.post_id = p.id AND up.user_id = ?) as is_unlocked,
        (SELECT COUNT(*) FROM user_follows wf WHERE wf.following_id = p.user_id AND wf.follower_id = ?) as is_following
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN company_profiles cp ON u.id = cp.user_id
      WHERE 1=1
    `;

    const params: any[] = [currentUserId, currentUserId, currentUserId, currentUserId];

    if (personal_only === "true") {
      sql += " AND p.user_id = ?";
      params.push(currentUserId);
    }

    if (type) {
      sql += " AND p.type = ?";
      params.push(type);
    }
    if (tag) {
      sql += " AND p.tags LIKE ?";
      params.push(`%${tag}%`);
    }
    if (company) {
      sql += " AND p.company_name LIKE ?";
      params.push(`%${company}%`);
    }
    if (is_verified) {
      sql += " AND p.is_verified = ?";
      params.push(is_verified === "true" || is_verified === "1" ? 1 : 0);
    }
    if (author_role) {
      sql += " AND p.author_role = ?";
      params.push(author_role);
    }
    if (search) {
      sql += " AND (p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ? OR p.company_name LIKE ?)";
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    sql += " ORDER BY p.created_at DESC";

    const [posts]: any = await db.query(sql, params);

    // B. AI Personalized Recommendation Scoring based on calling user's skills
    const [studentProfile]: any = await db.query("SELECT skills_json,preferred_job_role FROM student_profiles WHERE user_id = ?", [currentUserId]);
    let studentSkills: string[] = [];
    if (studentProfile && studentProfile.length > 0 && studentProfile[0].skills_json) {
      try {
        const skillsObj = typeof studentProfile[0].skills_json === "string" 
          ? JSON.parse(studentProfile[0].skills_json) 
          : studentProfile[0].skills_json;
        if (Array.isArray(skillsObj)) {
          studentSkills = skillsObj.map((s: any) => (typeof s === "string" ? s : s.name || "")).filter((s: string) => s.length > 0);
        } else if (skillsObj && typeof skillsObj === "object") {
          studentSkills = Object.keys(skillsObj);
        }
      } catch (ex) {
        console.warn("Failed parsing skills_json for feeding:", ex);
      }
    }

    // Attach custom computed properties
    const enrichedPosts = posts.map((post: any) => {
      // Calculate matching recommendation strength
      let matchScore = 0;
      const lowerText = (post.title + " " + post.tags + " " + post.content).toLowerCase();
      studentSkills.forEach((skill) => {
        if (lowerText.includes(skill.toLowerCase())) {
          matchScore += 25;
        }
      });

      // Boost score if the tags align with student interests
      if (post.is_verified) matchScore += 15;
      if (post.content_score >= 90) matchScore += 10;

      // Handle author name cleanly
      let creatorName = "Alumnus / Professional";
      if (post.student_name) creatorName = post.student_name;
      else if (post.corp_name) creatorName = post.corp_name;
      else if (post.creator_email) {
        creatorName = post.creator_email.split("@")[0];
        creatorName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
      }

      // Handle profile image carefully
      const defaultPhoto = `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.user_id}`;
      const creatorPhoto = post.student_photo || post.corp_photo || defaultPhoto;

      // Check unlock state
      const cost = Number(post.xp_unlock_cost);
      let unlocked = false;
      if (cost === 0 || post.user_id === currentUserId || post.is_unlocked > 0) {
        unlocked = true;
      }

      return {
        ...post,
        creatorName,
        creatorPhoto,
        recommendationBoost: Math.min(matchScore, 100),
        unlocked,
      };
    });

    // In descending of recommendationBoost if user has matching skills
    const finalPosts = enrichedPosts.sort((a: any, b: any) => {
      if (b.recommendationBoost !== a.recommendationBoost) {
        return b.recommendationBoost - a.recommendationBoost;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json({ success: true, posts: finalPosts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error fetching feeding: " + error.message });
  }
});

/**
 * 🔒 XP-BASED CONTENT UNLOCK SYSTEM
 * Subtract from student's XP balance, add rewards to content creator
 */
router.post("/posts/:id/unlock", authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const postId = Number(req.params.id);

  try {
    const [posts]: any = await db.query("SELECT * FROM posts WHERE id = ?", [postId]);
    if (!posts || posts.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const post = posts[0];
    const cost = Number(post.xp_unlock_cost || 0);

    if (post.user_id === userId) {
      return res.json({ success: true, message: "You already own this post." });
    }

    // Check if already unlocked
    const [existingUnlock]: any = await db.query(
      "SELECT * FROM unlocked_posts WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );
    if (existingUnlock && existingUnlock.length > 0) {
      return res.json({ success: true, message: "Content already unlocked." });
    }

    // Deduct XP
    await XPService.deductXP(userId, cost, "BONUS", `Unlocked premium post: "${post.title}"`);

    // Log unlock mapping
    await db.query("INSERT INTO unlocked_posts (user_id, post_id) VALUES (?, ?)", [userId, postId]);

    // Reward creator: Unlock awards dynamic XP
    const unlockReward = await XPService.getConfigValue("COMMUNITY_UNLOCK_XP_REWARD", 5);
    await XPService.addXP(post.user_id, unlockReward, "BONUS", `[Community] Your post "${post.title}" was unlocked by a junior`);

    // Increment unlock counters
    await db.query("UPDATE posts SET unlock_count = unlock_count + 1 WHERE id = ?", [postId]);

    res.json({
      success: true,
      message: `Successfully unlocked post using ${cost} XP!`,
      content: post.content,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Error unlocking content." });
  }
});

/**
 * ❤️ LIKE / UNLIKE POST
 * Liking awards +1 XP to creator. Unliking drops it.
 */
router.post("/posts/:id/like", authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const postId = Number(req.params.id);

  try {
    const [posts]: any = await db.query("SELECT * FROM posts WHERE id = ?", [postId]);
    if (!posts || posts.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const post = posts[0];

    const [existingLikes]: any = await db.query(
      "SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existingLikes && existingLikes.length > 0) {
      // Unlike
      await db.query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, userId]);
      await db.query("UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?", [postId]);
      res.json({ success: true, liked: false, message: "Post unliked" });
    } else {
      // Like
      await db.query("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [postId, userId]);
      await db.query("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", [postId]);

      // Dynamic XP reward to content creator
      const likeReward = await XPService.getConfigValue("COMMUNITY_LIKE_XP_REWARD", 1);
      if (post.user_id !== userId && likeReward > 0) {
        await XPService.addXP(post.user_id, likeReward, "BONUS", `[Community] Received a like on your article: "${post.title}"`);
      }

      res.json({ success: true, liked: true, message: "Post liked" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Error processing like: " + err.message });
  }
});

/**
 * 🔒 CREATE COMMENT WITH OPTIONAL GEMINI TOXICITY MODERATION
 * Commenting awards +2 XP to the content creator
 */
router.post("/posts/:id/comment", authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const postId = Number(req.params.id);
  const { comment, parent_comment_id = null } = req.body;

  if (!comment) {
    return res.status(400).json({ success: false, message: "Comment cannot be empty" });
  }

  // A. Toxicity Check via Gemini if enabled
  let isToxic = false;
  let toxicityReason = "Our system detected offensive language.";

  if (ai) {
    try {
      const moderationPrompt = `
      You are a polite, objective community safety assistant. Analyze the incoming comment to see if it violates professional standards (contains hate speech, explicit slurs, severe harassment, extreme profanity, or toxic spam).
      
      Comment: "${comment}"
      
      Respond in exact JSON format:
      {
        "is_toxic": boolean,
        "reason": "short explanation of why it was flagged or if safe keep empty"
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: moderationPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_toxic: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ["is_toxic", "reason"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      if (result.is_toxic) {
        isToxic = true;
        toxicityReason = result.reason || toxicityReason;
      }
    } catch (e) {
      console.warn("Toxicity model check failed, skipping to safety standard checking...", e);
    }
  }

  if (isToxic) {
    return res.status(400).json({
      success: false,
      message: `Comment blocked by safety moderation: ${toxicityReason}`,
    });
  }

  try {
    const [posts]: any = await db.query("SELECT * FROM posts WHERE id = ?", [postId]);
    if (!posts || posts.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const post = posts[0];

    // Insert comment
    await db.query(
      "INSERT INTO post_comments (post_id, user_id, comment, parent_comment_id) VALUES (?, ?, ?, ?)",
      [postId, userId, comment, parent_comment_id]
    );

    // Update comment counter
    await db.query("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", [postId]);

    // Dynamic XP to post creator
    const commentReward = await XPService.getConfigValue("COMMUNITY_COMMENT_XP_REWARD", 2);
    if (post.user_id !== userId && commentReward > 0) {
      await XPService.addXP(post.user_id, commentReward, "BONUS", `[Community] Received a comment feedback on your article: "${post.title}"`);
    }

    res.json({ success: true, message: "Comment posted successfully!" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Error saving comment: " + err.message });
  }
});

/**
 * 🎓 GET COMMENTS FOR POST
 */
router.get("/posts/:id/comments", authenticate, async (req: any, res) => {
  const postId = Number(req.params.id);

  try {
    const [comments]: any = await db.query(
      `
      SELECT 
        c.*,
        u.email as creator_email,
        sp.full_name as student_name,
        sp.profile_photo_url as student_photo,
        cp.company_name as corp_name,
        cp.logo_url as corp_photo
      FROM post_comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN company_profiles cp ON u.id = cp.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `,
      [postId]
    );

    const processedComments = comments.map((c: any) => {
      let authorName = "Alumnus / Professional";
      if (c.student_name) authorName = c.student_name;
      else if (c.corp_name) authorName = c.corp_name;
      else if (c.creator_email) {
        authorName = c.creator_email.split("@")[0];
        authorName = authorName.charAt(0).toUpperCase() + authorName.slice(1);
      }

      const defaultPhoto = `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.user_id}`;
      const authorPhoto = c.student_photo || c.corp_photo || defaultPhoto;

      return {
        ...c,
        authorName,
        authorPhoto,
      };
    });

    res.json({ success: true, comments: processedComments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Error fetching comments: " + err.message });
  }
});

/**
 * 💾 BOOKMARK / UN-BOOKMARK
 */
router.post("/posts/:id/bookmark", authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  const postId = Number(req.params.id);

  try {
    const [existing]: any = await db.query(
      "SELECT * FROM post_bookmarks WHERE post_id = ? AND user_id = ?",
      [postId, userId]
    );

    if (existing && existing.length > 0) {
      await db.query("DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?", [postId, userId]);
      res.json({ success: true, bookmarked: false, message: "Bookmark removed" });
    } else {
      await db.query("INSERT INTO post_bookmarks (post_id, user_id) VALUES (?, ?)", [postId, userId]);
      res.json({ success: true, bookmarked: true, message: "Bookmark saved" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 👥 FOLLOW / UNFOLLOW CREATOR
 */
router.post("/users/:id/follow", authenticate, async (req: any, res) => {
  const currentUserId = req.user.userId;
  const targetCreatorId = Number(req.params.id);

  if (currentUserId === targetCreatorId) {
    return res.status(400).json({ success: false, message: "You cannot follow yourself" });
  }

  try {
    const [existing]: any = await db.query(
      "SELECT * FROM user_follows WHERE follower_id = ? AND following_id = ?",
      [currentUserId, targetCreatorId]
    );

    if (existing && existing.length > 0) {
      await db.query("DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?", [
        currentUserId,
        targetCreatorId,
      ]);
      res.json({ success: true, following: false, message: "Creator unfollowed." });
    } else {
      await db.query("INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)", [
        currentUserId,
        targetCreatorId,
      ]);
      res.json({ success: true, following: true, message: "Successfully followed creator!" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ⭐️ CREATOR ANALYTICS DASHBOARD
 * View content statistics, unlock count, followers rate
 */
router.get("/creator/analytics", authenticate, async (req: any, res) => {
  const userId = req.user.userId;

  try {
    const [posts]: any = await db.query(
      `
      SELECT 
        COUNT(id) as total_posts,
        IFNULL(SUM(likes_count), 0) as total_likes,
        IFNULL(SUM(comments_count), 0) as total_comments,
        IFNULL(SUM(unlock_count), 0) as total_unlocks
      FROM posts 
      WHERE user_id = ?
    `,
      [userId]
    );

    const [follows]: any = await db.query(
      "SELECT COUNT(id) as followers FROM user_follows WHERE following_id = ?",
      [userId]
    );

    const [transactions]: any = await db.query(
      `
      SELECT IFNULL(SUM(amount), 0) as earned_xp 
      FROM xp_transactions 
      WHERE user_id = ? AND amount > 0 AND (
        description LIKE '%community%' 
        OR description LIKE '%article%' 
        OR description LIKE '%post%' 
        OR description LIKE '%unlocked by a junior%' 
        OR description LIKE '%comment feedback%' 
        OR description LIKE '%like on your%'
      )
    `,
      [userId]
    );

    res.json({
      success: true,
      stats: {
        totalPosts: posts[0]?.total_posts || 0,
        totalLikes: posts[0]?.total_likes || 0,
        totalComments: posts[0]?.total_comments || 0,
        totalUnlocks: posts[0]?.total_unlocks || 0,
        followersCount: follows[0]?.followers || 0,
        earnedXP: transactions[0]?.earned_xp || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error calculating details: " + error.message });
  }
});

/**
 * 🏆 LEADERBOARD
 */
router.get("/leaderboard", authenticate, async (req: any, res) => {
  try {
    const [leaders]: any = await db.query(`
      SELECT 
        u.id, u.email, u.xp_balance,
        sp.full_name, sp.profile_photo_url, sp.headline,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) as total_posts,
        (SELECT COUNT(*) FROM user_follows f WHERE f.following_id = u.id) as total_followers
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.role != 'ADMIN' AND u.role != 'SUPER_ADMIN'
      ORDER BY u.xp_balance DESC, total_posts DESC
      LIMIT 10
    `);

    const leaderboard = leaders.map((lead: any) => {
      let name = lead.full_name;
      if (!name) {
        name = lead.email.split("@")[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      return {
        id: lead.id,
        name,
        headline: lead.headline || "Ambitious Professional",
        photo: lead.profile_photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${lead.id}`,
        xp: lead.xp_balance,
        posts: lead.total_posts,
        followers: lead.total_followers,
      };
    });

    res.json({ success: true, leaderboard });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🛠️ TOGGLE POST VERIFICATION (ADMIN ONLY)
 */
router.post("/posts/:id/verify", authenticate, async (req: any, res) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Authorized for Admins only" });
  }

  const postId = Number(req.params.id);
  const { is_verified } = req.body;

  try {
    await db.query("UPDATE posts SET is_verified = ? WHERE id = ?", [is_verified ? 1 : 0, postId]);
    res.json({ success: true, message: `Post is successfully ${is_verified ? "verified" : "unverified"}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
