/**
 * Prisma Client singleton for Next.js
 * Prevents multiple instances in development due to hot reloading
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    transactionOptions: {
      maxWait: 10000,  // max time to wait to acquire a connection (ms)
      timeout: 30000,  // max time for the transaction to complete (ms) — default 5000 is too low for invoice+GL+COGS
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
