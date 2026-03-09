import type { Queue as QueueType, QueueScheduler as QueueSchedulerType, Worker as WorkerType } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let connection: any = null;
let recurringQueue: QueueType<RecurringJobData> | null = null;
let recurringScheduler: QueueSchedulerType | null = null;

async function getConnection() {
  if (!connection) {
    const IORedis = (await import('ioredis')).default;
    connection = new IORedis(redisUrl);
  }
  return connection;
}

export const recurringQueueName = 'recurring:execute';

export type RecurringJobData = {
  orgId: string;
  templateId: string;
};

export async function getRecurringQueue() {
  if (!recurringQueue) {
    const { Queue, QueueScheduler } = await import('bullmq');
    const conn = await getConnection();
    recurringQueue = new Queue<RecurringJobData>(recurringQueueName, { connection: conn });
    if (!recurringScheduler) {
      recurringScheduler = new QueueScheduler(recurringQueueName, { connection: conn });
    }
  }
  return recurringQueue;
}

export async function createRecurringWorker(processor: (job: { data: RecurringJobData }) => Promise<any>, opts?: { concurrency?: number }) {
  const { Worker } = await import('bullmq');
  const conn = await getConnection();
  return new Worker<RecurringJobData>(recurringQueueName, processor, {
    connection: conn,
    concurrency: opts?.concurrency ?? 5,
  });
}

export async function shutdownBullmq() {
  await recurringQueue?.close();
  await recurringScheduler?.close();
  await connection?.quit();
}
