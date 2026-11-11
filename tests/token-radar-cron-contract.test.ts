import {test,expect} from "bun:test";
const source=await Bun.file(new URL("../services/lifecycle-worker/railway-function.ts",import.meta.url)).text();
test("monitoring reuses the existing lifecycle Railway cron and a source-backed R2 endpoint",()=>{
 expect(source).toContain("async function refreshTokenWatchlist()");
 expect(source).toContain("WHERE w.chain_id='solana' AND w.in_app_alerts=TRUE");
 expect(source).toContain("ORDER BY MAX(o.last_seen_at) NULLS FIRST LIMIT 10");
 expect(source).toContain("signalforge-web-production.up.railway.app");
 expect(source).toContain('"/api/tokens/lookup?chain=solana&address="');
 expect(source).toContain('report.observationState!=="PERSISTENCE_UNAVAILABLE"');
 expect(source).toContain("RADAR_MONITOR_DONE");
});
test("existing email lifecycle and provider opt-in behavior are retained",()=>{
 expect(source).toContain("RESEND_API_KEY");
 expect(source).toContain("RESEND_FROM");
 expect(source).toContain("lifecycle_email_consent");
 expect(source).toContain("LIFECYCLE_WORKER_DONE");
 expect(source).toContain("LIFECYCLE_WORKER_BLOCKED");
 expect(source).not.toContain("setInterval(");
});
