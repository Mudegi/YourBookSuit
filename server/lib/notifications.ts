import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl);

export type NotificationJob = {
  type: 'email' | 'sms';
  to: string;
  subject?: string;
  body: string;
};

export const notificationQueue = new Queue<NotificationJob>('notifications', {
  connection,
});

export async function enqueueNotification(job: NotificationJob) {
  await notificationQueue.add('notify', job, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
}

export function createNotificationWorker(handler: (job: { data: NotificationJob }) => Promise<void>) {
  return new Worker<NotificationJob>('notifications', handler, { connection, concurrency: 5 });
}

export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (!apiKey || !from) {
    console.log(`[Notify] Email (stub) to ${to}: ${subject}`);
    return;
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error('[Notify] SendGrid error', res.status, txt);
  }
}

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    console.log(`[Notify] SMS (stub) to ${to}: ${body}`);
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error('[Notify] Twilio error', res.status, txt);
  }
}
