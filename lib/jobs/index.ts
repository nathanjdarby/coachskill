import "server-only";
import { syncDueCalendars } from "@/lib/calendar-sync";
import { sendSessionReminders1h, sendSessionReminders24h } from "./session-reminders";
import { sendBalanceReminders, sendBalanceRequests } from "./workshop-balance";
import { sendWorkshopReminders1h, sendWorkshopReminders24h } from "./workshop-reminders";

type Job = (now: Date) => Promise<number>;

const JOBS: Record<string, Job> = {
  // First, so fresh busy times are in place before anything else runs.
  calendarSync: syncDueCalendars,
  balanceRequests: sendBalanceRequests,
  balanceReminders: sendBalanceReminders,
  sessionReminders24h: sendSessionReminders24h,
  sessionReminders1h: sendSessionReminders1h,
  workshopReminders24h: sendWorkshopReminders24h,
  workshopReminders1h: sendWorkshopReminders1h,
};

/** Runs every scheduled job; one failing job doesn't stop the others. */
export async function runDueJobs(now = new Date()) {
  const results: Record<string, number | string> = {};
  for (const [name, job] of Object.entries(JOBS)) {
    try {
      results[name] = await job(now);
    } catch (err) {
      console.error(`Job ${name} failed`, err);
      results[name] = "error";
    }
  }
  return results;
}
