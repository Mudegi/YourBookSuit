import { startInAppScheduler } from '@/services/recurring/scheduler';
import { prisma } from '@/lib/prisma';
import { shutdownBullmq } from '@/lib/bullmq';

async function main() {
  console.log('[Scheduler] Starting recurring enqueue loop (BullMQ)...');
  startInAppScheduler(60_000); // Every minute
  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n[Scheduler] Shutting down...');
    await shutdownBullmq();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Scheduler] Failed to start', err);
  process.exit(1);
});
