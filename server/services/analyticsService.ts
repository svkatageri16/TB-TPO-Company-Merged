import db from "../db.ts";

export async function updateLoginStreak(userId: number) {
  try {
    const [tracking]: any = await db.query("SELECT * FROM activity_tracking WHERE user_id = ?", [userId]);
    const now = new Date();
    
    if (!tracking || tracking.length === 0) {
      try {
        await db.query("INSERT INTO activity_tracking (user_id, streak_days, last_active) VALUES (?, 1, ?)", [userId, now]);
        await db.query("UPDATE users SET login_streak = 1 WHERE id = ?", [userId]);
      } catch (insertErr: any) {
        if (insertErr.code !== 'ER_DUP_ENTRY' && !insertErr.message?.includes('UNIQUE constraint failed')) {
          console.error("Streak tracking insert error:", insertErr);
        }
      }
      return;
    }

    const lastActive = new Date(tracking[0].last_active || now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    
    const diffTime = today.getTime() - lastActiveDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      const newStreak = (tracking[0].streak_days || 0) + 1;
      await db.query("UPDATE activity_tracking SET streak_days = ?, last_active = ? WHERE user_id = ?", [newStreak, now, userId]);
      await db.query("UPDATE users SET login_streak = ? WHERE id = ?", [newStreak, userId]);
    } else if (diffDays > 1) {
      await db.query("UPDATE activity_tracking SET streak_days = 1, last_active = ? WHERE user_id = ?", [now, userId]);
      await db.query("UPDATE users SET login_streak = 1 WHERE id = ?", [userId]);
    } else {
      await db.query("UPDATE activity_tracking SET last_active = ? WHERE user_id = ?", [now, userId]);
    }
  } catch (error) {
    console.error("Error maintaining streak:", error);
  }
}

export async function calculateTalentScore(userId: number) {
  try {
    // 1. Get Profile Completeness (10%)
    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId]);
    const profile = profiles[0];
    if (!profile) return 0;
    
    // We base profile completeness weight on the existing completeness score.
    const profileScore = profile.completeness_score || 0;
    const profileWeight = (profileScore / 100) * 10;

    // 2. AI Mock Interview Score (20%)
    const [history]: any = await db.query(`
      SELECT AVG(score) as avg_score, COUNT(*) as interview_count 
      FROM interview_history ih
      JOIN student_profiles sp ON ih.student_id = sp.id
      WHERE sp.user_id = ?
    `, [userId]);
    const interviewAvg = history[0]?.avg_score || 0;
    const interviewCount = history[0]?.interview_count || 0;
    
    // Convert out of 100
    // Sometimes old interview score was out of 10. Let's normalize it to 100 if it's less than 10.
    const normalizedInterviewScore = interviewAvg <= 10 && interviewAvg > 0 ? interviewAvg * 10 : (interviewAvg || 0);
    // Add a slight penalty if count is very low to encourage consistency
    const interviewFinalScore = Math.min(normalizedInterviewScore * (interviewCount > 0 ? 1 : 0), 100);
    const interviewWeight = (interviewFinalScore / 100) * 20;

    // 3. AI Quiz/Test Performance (20%)
    const [quizzes]: any = await db.query(`
      SELECT AVG(percentage) as avg_quiz_score 
      FROM quizzes 
      WHERE user_id = ? AND status = 'COMPLETED'
    `, [userId]);
    const quizScore = quizzes[0]?.avg_quiz_score || 0;
    const quizWeight = (quizScore / 100) * 20;

    // 4. Coding Platform Analysis (20%)
    const [codingData]: any = await db.query(`
      SELECT coding_score FROM coding_analysis WHERE user_id = ?
    `, [userId]);
    let codingScore = codingData[0]?.coding_score || 0;
    
    // If no analysis score, fallback to simple stats check
    if (!codingScore) {
       const [codingStats]: any = await db.query(`
         SELECT cs.problems_solved, cs.contest_rating 
         FROM coding_stats cs
         JOIN coding_profiles cp ON cs.profile_id = cp.id
         WHERE cp.user_id = ?
       `, [userId]);
       
       if (codingStats.length > 0) {
          const solved = codingStats.reduce((sum: number, stat: any) => sum + (stat.problems_solved || 0), 0);
          codingScore = Math.min((solved / 200) * 100, 100);
       }
    }
    const codingWeight = (codingScore / 100) * 20;

    // 5. Intelligence Assessment (PQ, IQ, EQ, SQ - 10% total, 2.5% each)
    const [intelData]: any = await db.query("SELECT * FROM student_assessment_results WHERE user_id = ?", [userId]);
    const intel = intelData[0] || {};
    const pqScore = intel.pq_score || 0;
    const iqScore = intel.iq_score || 0;
    const eqScore = intel.eq_score || 0;
    const sqScore = intel.sq_score || 0;
    
    // Scale 100 max for each down to 2.5 max contribution each
    const pqWeight = (pqScore / 100) * 2.5;
    const iqWeight = (iqScore / 100) * 2.5;
    const eqWeight = (eqScore / 100) * 2.5;
    const sqWeight = (sqScore / 100) * 2.5;
    
    // If not using new intelligence system yet, fallback to older psychometric schema, or 0.
    const [psychResults]: any = await db.query("SELECT overall_score FROM psychometric_results WHERE user_id = ?", [userId]);
    const oldPsychScore = psychResults[0]?.overall_score || 0;
    const oldPsychWeight = (oldPsychScore / 100) * 10;
    
    let psychWeight = 0;
    let combinedPsychScore = 0;
    if (pqScore || iqScore || eqScore || sqScore) {
       psychWeight = pqWeight + iqWeight + eqWeight + sqWeight;
       combinedPsychScore = Math.round((pqScore + iqScore + eqScore + sqScore) / 4);
    } else {
       psychWeight = oldPsychWeight;
       combinedPsychScore = oldPsychScore;
    }

    // 6. Extracurricular & Leadership (10%)
    const [leadershipData]: any = await db.query("SELECT leadership_score FROM leadership_analysis WHERE user_id = ?", [userId]);
    let leadershipScore = leadershipData[0]?.leadership_score || 0;
    
    // Fallback if no analysis but has activities
    if (!leadershipScore) {
       const [activities]: any = await db.query("SELECT COUNT(*) as count FROM extracurricular_activities WHERE user_id = ?", [userId]);
       const count = activities[0]?.count || 0;
       leadershipScore = Math.min((count / 3) * 100, 100); // 3 activities max out the score if no AI analysis
    }
    const leadershipWeight = (leadershipScore / 100) * 10;

    // 7. Activity & Consistency (10%)
    // Let's use users login_streak and activity tracking
    const [userRow]: any = await db.query("SELECT login_streak FROM users WHERE id = ?", [userId]);
    const streak = userRow[0]?.login_streak || 0;
    
    const [activityData]: any = await db.query("SELECT consistency_score FROM activity_tracking WHERE user_id = ?", [userId]);
    let consistencyScore = activityData[0]?.consistency_score || 0;
    
    if (!consistencyScore) {
       // roughly 7 days streak => 100 consistency
       consistencyScore = Math.min((streak / 7) * 100, 100);
    }
    const activityWeight = (consistencyScore / 100) * 10;

    const totalScore = Math.round(
      profileWeight + 
      interviewWeight + 
      quizWeight + 
      codingWeight + 
      psychWeight + 
      leadershipWeight + 
      activityWeight
    );

    const breakdown = {
      profile: Math.round(profileWeight * (100/10)), // Store out of 100 for individual metrics
      interview: Math.round(interviewFinalScore),
      quiz: Math.round(quizScore),
      coding: Math.round(codingScore),
      psychometric: Math.round(combinedPsychScore),
      leadership: Math.round(leadershipScore),
      activity: Math.round(consistencyScore),
      weights: {
        profile: Math.round(profileWeight),
        interview: Math.round(interviewWeight),
        quiz: Math.round(quizWeight),
        coding: Math.round(codingWeight),
        psychometric: Math.round(psychWeight),
        leadership: Math.round(leadershipWeight),
        activity: Math.round(activityWeight)
      }
    };

    // Update table
    const [existingScore]: any = await db.query("SELECT id FROM talent_scores WHERE user_id = ?", [userId]);
    if (existingScore.length > 0) {
      await db.query(
        "UPDATE talent_scores SET overall_score = ?, breakdown_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [totalScore, JSON.stringify(breakdown), userId]
      );
    } else {
      await db.query(
        "INSERT INTO talent_scores (user_id, overall_score, breakdown_json) VALUES (?, ?, ?)",
        [userId, totalScore, JSON.stringify(breakdown)]
      );
    }

    return totalScore;
  } catch (error) {
    console.error("Error calculating talent score:", error);
    return 0;
  }
}

export async function updateDailyTask(userId: number, taskType: 'INTERVIEW' | 'PROFILE' | 'CHECK_IN') {
  try {
    const today = new Date().toISOString().split('T')[0];
    const xpReward = 50;

    const [existing]: any = await db.query(
      "SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ?",
      [userId, today]
    );

    if (existing.length === 0) {
      // First task of the day
      await db.query(`
        INSERT INTO daily_tasks (user_id, task_date, is_check_in_completed, is_interview_completed, is_profile_updated, xp_earned)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, today, taskType === 'CHECK_IN' ? 1 : 0, taskType === 'INTERVIEW' ? 1 : 0, taskType === 'PROFILE' ? 1 : 0, 0]);
      
      // Update last active in stats (XP is now handled by XPService)
      const [stats]: any = await db.query("SELECT id FROM student_performance_stats WHERE user_id = ?", [userId]);
      if (stats.length > 0) {
        await db.query(`
          UPDATE student_performance_stats 
          SET last_active_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [userId]);
      } else {
        await db.query(`
          INSERT INTO student_performance_stats (user_id, xp_points, last_active_at, current_streak)
          VALUES (?, ?, CURRENT_TIMESTAMP, 1)
        `, [userId, 0]);
      }
    } else {
      const task = existing[0];
      let column = '';
      if (taskType === 'INTERVIEW') column = 'is_interview_completed';
      else if (taskType === 'PROFILE') column = 'is_profile_updated';
      else if (taskType === 'CHECK_IN') column = 'is_check_in_completed';
      
      if (column && !task[column]) {
        await db.query(`
          UPDATE daily_tasks 
          SET ${column} = 1
          WHERE user_id = ? AND task_date = ?
        `, [userId, today]);

        await db.query(`
          UPDATE student_performance_stats 
          SET last_active_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [userId]);
      }
    }

    // Check for badges
    await checkAndAwardBadges(userId);
    // Recalculate talent score
    await calculateTalentScore(userId);

  } catch (error) {
    console.error("Error updating daily task:", error);
  }
}

async function checkAndAwardBadges(userId: number) {
  const [users]: any = await db.query("SELECT total_earned_xp FROM users WHERE id = ?", [userId]);
  const xp = users[0]?.total_earned_xp || 0;

  let badgeType: 'BEGINNER' | 'INTERMEDIATE' | 'PRO' | null = null;
  let badgeName = "";

  if (xp > 500) { badgeType = 'PRO'; badgeName = "Elite Performer"; }
  else if (xp > 200) { badgeType = 'INTERMEDIATE'; badgeName = "Rising Star"; }
  else if (xp > 50) { badgeType = 'BEGINNER'; badgeName = "Fast Learner"; }

  if (badgeType) {
    await db.query(`
      INSERT IGNORE INTO user_badges (user_id, badge_name, badge_type)
      VALUES (?, ?, ?)
    `, [userId, badgeName, badgeType]);
  }
}

export async function logProfileView(studentUserId: number, companyUserId: number) {
  try {
    // Get student profile ID
    const [students]: any = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [studentUserId]);
    const [companies]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
    
    if (students[0] && companies[0]) {
      await db.query(
        "INSERT INTO profile_views (student_id, company_id) VALUES (?, ?)",
        [students[0].id, companies[0].id]
      );
    }
  } catch (error) {
    console.error("Error logging profile view:", error);
  }
}
