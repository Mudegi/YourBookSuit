import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let connection: IORedis | null = null;
let recurringQueue: Queue<RecurringJobData> | null = null;
let recurringScheduler: QueueScheduler | null = null;

function getConnection() {
  if (!connection) {
    connection = new IORedis(redisUrl);
  }
  return connection;
}

export const recurringQueueName = 'recurring:execute';

export type RecurringJobData = {
  orgId: string;
  templateId: string;
};

export function getRecurringQueue() {
  if (!recurringQueue) {
    const conn = getConnection();
    recurringQueue = new Queue<RecurringJobData>(recurringQueueName, { connection: conn });
    if (!recurringScheduler) {
      recurringScheduler = new QueueScheduler(recurringQueueName, { connection: conn });
    }
  }
  return recurringQueue;
}

export function createRecurringWorker(processor: (job: { data: RecurringJobData }) => Promise<any>, opts?: { concurrency?: number }) {
  const conn = getConnection();
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
