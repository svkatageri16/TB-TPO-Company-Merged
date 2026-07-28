import db from "../db.ts";
import { sendJobEndingSoonEmail } from "./emailService.ts";
import { processJobEnding } from "./jobLifecycleService.ts";

export async function checkAndProcessJobExpirations() {
  try {
    const now = new Date();
    // Fetch all OPEN jobs with a deadline
    const [jobs]: any = await db.query(
      "SELECT * FROM jobs WHERE status = 'OPEN' AND deadline IS NOT NULL"
    );

    const reminderHours = Number(process.env.JOB_END_REMINDER_HOURS) || 24;

    for (const job of jobs) {
      const deadlineDate = new Date(job.deadline);
      // Deadline is end of day (23:59:59.999) of that date
      deadlineDate.setHours(23, 59, 59, 999);

      if (deadlineDate < now) {
        // Natural Expiry: Set status to CLOSED and notify unresolved candidates idempotently
        console.log(`[JobExpiryService] Job ID ${job.id} (${job.title}) has reached its deadline and is now CLOSED.`);
        await processJobEnding(job.id, job.company_id);
      } else {
        // Check if within reminder window (e.g. 24 hours) and reminder hasn't been sent yet
        const diffMs = deadlineDate.getTime() - now.getTime();
        const hoursRemaining = diffMs / (1000 * 60 * 60);

        if (hoursRemaining > 0 && hoursRemaining <= reminderHours && !job.end_reminder_sent_at) {
          console.log(`[JobExpiryService] Job ID ${job.id} (${job.title}) is ending in ${hoursRemaining.toFixed(2)} hours. Sending reminder to HR.`);

          // Mark as sent immediately to avoid race conditions or duplicates
          await db.query(
            "UPDATE jobs SET end_reminder_sent_at = ? WHERE id = ?",
            [now, job.id]
          );

          // Find company user to notify
          const [hrUsers]: any = await db.query(`
            SELECT cp.user_id, cp.company_name, cp.company_email, u.email as user_email
            FROM company_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.id = ?
          `, [job.company_id]);

          if (hrUsers.length > 0) {
            const hrUser = hrUsers[0];
            const userId = hrUser.user_id;
            const emailToNotify = hrUser.company_email || hrUser.user_email;
            const hrName = hrUser.company_name || "HR Manager";

            // Insert Portal Notification
            await db.query(
              "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
              [
                userId,
                "Job post ending soon",
                `Your job post for ${job.title} is ending soon. The related pipeline will also be closed when the post ends.`,
                "JOB_ENDING_SOON"
              ]
            );

            // Send Email Notification
            if (emailToNotify) {
              const appUrl = process.env.APP_URL || "https://ais-dev-46zw574khhgnqogfl7w66x-909774873082.asia-east1.run.app";
              const link = `${appUrl}/company/jobs`;
              try {
                await sendJobEndingSoonEmail(
                  emailToNotify,
                  hrName,
                  job.title,
                  job.location || "Remote",
                  job.deadline,
                  link
                );
                console.log(`[JobExpiryService] Successfully sent ending soon notification email to ${emailToNotify}`);
              } catch (emailErr) {
                console.error(`[JobExpiryService] Error sending email for Job ${job.id}:`, emailErr);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[JobExpiryService] Error in checkAndProcessJobExpirations:", error);
  }
}
