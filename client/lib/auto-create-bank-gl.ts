import { prisma } from '@/lib/prisma';

/**
 * Auto-create a GL sub-account under 1000 (Cash & Cash Equivalents) for a bank account.
 *
 * Naming: "Bank - {bankName}" (e.g. "Bank - Stanbic Bank")
 * Codes:  1001, 1002, 1003, … (next available under 1xxx, skipping reserved codes)
 *
 * Returns the ChartOfAccount.id of the created (or existing) GL account.
 */
export async function autoCreateBankGLAccount(
  organizationId: string,
  bankName: string,
  currency?: string,
): Promise<string> {
  const glName = `Bank - ${bankName}`;

  // Check if a matching GL account already exists for this bank name
  const existing = await prisma.chartOfAccount.findFirst({
    where: { organizationId, name: glName, accountType: 'ASSET', isActive: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  // Find next available code in the 1001-1099 range
  const usedCodes = await prisma.chartOfAccount.findMany({
    where: {
      organizationId,
      code: { gte: '1001', lte: '1099' },
    },
    select: { code: true },
    orderBy: { code: 'asc' },
  });

  const usedSet = new Set(usedCodes.map((a) => a.code));
  let nextCode = '1001';
  for (let i = 1001; i <= 1099; i++) {
    const candidate = String(i);
    if (!usedSet.has(candidate)) {
      nextCode = candidate;
      break;
    }
  }

  // Find the parent account (1000 - Cash and Cash Equivalents)
  const parent = await prisma.chartOfAccount.findFirst({
    where: { organizationId, code: '1000' },
    select: { id: true },
  });

  const glAccount = await prisma.chartOfAccount.create({
    data: {
      organizationId,
      code: nextCode,
      name: glName,
      accountType: 'ASSET',
      accountSubType: 'Bank',
      parentId: parent?.id || undefined,
      currency: currency || undefined,
      description: `Auto-created GL account for ${bankName}`,
      isActive: true,
      isSystem: false,
      balance: 0,
      tags: ['bank', 'auto-created'],
    },
  });

  return glAccount.id;
}
