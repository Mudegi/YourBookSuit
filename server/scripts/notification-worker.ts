import { createNotificationWorker, notificationQueue, sendEmail, sendSms } from '@/lib/notifications';

const worker = createNotificationWorker(async (job) => {
  if (job.data.type === 'email') {
    await sendEmail(job.data.to, job.data.subject || '(no subject)', job.data.body);
  } else {
    await sendSms(job.data.to, job.data.body);
  }
});

worker.on('failed', (job, err) => {
  console.error('[Notify] Job failed', job?.id, err);
});

process.on('SIGINT', async () => {
  console.log('\n[Notify] Shutting down...');
  await worker.close();
  await notificationQueue.close();
  process.exit(0);
});
