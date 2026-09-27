import "server-only";
import { sendBalanceReminders, sendBalanceRequests } from "./workshop-balance";

type Job = (now: Date) => Promise<number>;

const JOBS: Record<string, Job> = {
  balanceRequests: sendBalanceRequests,
  balanceReminders: sendBalanceReminders,
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
